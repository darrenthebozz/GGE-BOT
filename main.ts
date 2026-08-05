import { mkdir, readFile } from 'node:fs/promises'
import { Worker } from 'node:worker_threads'
import { EventEmitter } from 'node:events'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import http from 'node:http'
import EmbeddedPostgres from 'embedded-postgres'
import { WebSocketServer, WebSocket } from 'ws'
import express from 'express'
import { safeParse } from 'secure-json-parse'
import { handler as ssrHandler } from './frontend/dist/server/entry.mjs'
import IterableWeakMap from './modules/IterableWeakMap.ts'
import type IUser from './modules/IUser.ts'
import UserAction from './modules/CUserAction.ts'

export const address = new URL("ws://127.0.0.1:8080")

const debug = 0
const debugPostgres = 0
const workingPath = join(tmpdir(), 'ggeBot')

console.debug = debug ? console.debug : () => { }

try { await mkdir(workingPath) } catch (e) { console.debug(e) }
const databaseDir = join(workingPath, './db')
const pg = new EmbeddedPostgres({
    databaseDir,
    port: 5436,
    persistent: true,
    onLog: debugPostgres ? console.debug : () => {}
})
let databaseInitialised = false

console.log(workingPath)
try { await pg.initialise(); databaseInitialised = true } catch (e) { console.debug(e) }
await pg.start()

export const client = await pg.getPgClient().connect()
const subUserEvents = new EventEmitter()
interface ActiveUser { logSubuserID? : number, ws : WebSocket }
const activeUsers: { [key: string]: IterableWeakMap<WebSocket, ActiveUser> | undefined } = {}

if (databaseInitialised)
    await client.query(await readFile('./init.sql').then(o => o.toString()))
await client.query(`LISTEN sub_user_update; LISTEN history_update`)
client.addListener('notification', ({ channel, payload }: any) => subUserEvents.emit(channel, payload))

const startBot = async (id : number, owneruuid : string) => {
    try {
        await client.query(`
        CREATE SEQUENCE IF NOT EXISTS history_sequence MINVALUE 1 MAXVALUE 128 CYCLE;
        
        CREATE TABLE IF NOT EXISTS history_${id} (
        sequence  INTEGER PRIMARY key,
        timestamp TIMESTAMP NOT NULL DEFAULT now(),
        data      TEXT[] NOT NULL,
        logLevel  VerbosityLevel NOT NULL,
        owneruuid TEXT NOT NULL);
        CREATE FUNCTION on_history_update_${id}()
        RETURNS TRIGGER AS $$
        BEGIN
        PERFORM pg_notify('history_update', '[' || '${id},' || row_to_json(NEW.*)::TEXT || ']');
        RETURN NEW;
        END $$ LANGUAGE PLPGSQL;
        CREATE TRIGGER history_${id}
        AFTER INSERT OR UPDATE ON history_${id}
        FOR EACH ROW
        EXECUTE FUNCTION on_history_update_${id}();`)
    } catch (e) { console.debug(e) }
    new Worker('./bot.ts', { workerData: {id, owneruuid: owneruuid} })
}
subUserEvents.addListener('history_update', payload => {
    const [id, log] = JSON.parse(payload) as [number, { sequence : number, timestamp : number, data : string[], owneruuid : string, logLevel : string }]
    const activeUser = activeUsers[log.owneruuid]
    if(!activeUser)
        return

    delete (log as any).sequence
    delete (log as any).owneruuid
    
    activeUser.forEach(({ws, logSubuserID}) => 
        id == logSubuserID && ws.send(JSON.stringify([UserAction.log, log])))
})
subUserEvents.addListener('sub_user_update', payload => {
    const [oldUser, newUser] = JSON.parse(payload) as [IUser, IUser]
    const userChanges = oldUser ? Object.entries(oldUser).reduce((obj: any, [key, value]) =>
        (newUser[key] != value && (obj[key] = newUser[key]), obj), {}) : newUser

    userChanges.id = newUser.id

    if (userChanges.state == true)
        startBot(newUser.id, newUser.owneruuid)

    const activeUser = activeUsers[newUser.owneruuid]

    if(!activeUser)
        return

    Array.from(activeUser.keys()).forEach(ws => 
        ws.send(JSON.stringify([UserAction.change, userChanges])))
})

await client.query('Select id, state, owneruuid from sub_users').then((r: any) => r.rows.forEach(({ id, state, owneruuid }: { id: number, state: boolean, owneruuid : string }) =>
    state ? startBot(id, owneruuid) : undefined))

export const wss = new WebSocketServer({ noServer: true })
const app = express().use('/', express.static('frontend/dist/client/')).use(ssrHandler)

http.createServer({}, app).listen(address.port).on('upgrade', (req, socket, head) => wss.handleUpgrade(req, socket, head, socket =>
    wss.emit('connection', socket, req)))

wss.addListener('connection', async (ws, { headers }) => {
    const uuid = headers.cookie?.split('; ').find(e => e.startsWith('uuid='))?.substring(5, Infinity)

    if (!uuid || !await client.query('Select uuid from users WHERE uuid=$1', [uuid]).then((r: any) => r.rows[0]?.uuid))
        return ws.close(4000)
    
    const activeUser = { ws } as ActiveUser

    activeUsers[uuid] ??= new IterableWeakMap()
    activeUsers[uuid].set(ws, activeUser)

    ws.send(JSON.stringify([UserAction.get, ...await client.query('Select name, plugins, state, serverType, server, id from sub_users WHERE owneruuid=$1', [uuid]).then((q: any) => q.rows)]))
    ws.addEventListener("message", async ({ data }) => {
        const [action, obj]: [number, any] = safeParse(data.toString())

        switch (action) {
            case UserAction.add:
                await client.query('INSERT INTO sub_users(name, loginToken, plugins, serverType, server, owneruuid) VALUES($2,$3,$4,$5,$6,$1)',
                    [uuid, ...Object.values(obj)])
                break
            case UserAction.change: {
                let i = 3
                await client.query("UPDATE sub_users SET " + (
                    (obj.name ? `name=$${i++},` : '') +
                    (obj.loginToken ? `loginToken=$${i++},` : '') +
                    (obj.plugins ? `plugins=$${i++},` : '') +
                    (obj.state ? `state=$${i++},` : '') +
                    (obj.serverType ? `serverType=$${i++},` : '') +
                    (obj.server ? `server=$${i++}` : '')
                ).replace(/\,$/, '') + " WHERE owneruuid=$1 AND id=$2", [uuid, ...Object.values(obj)])
                break
            }
            case UserAction.delete:
                await client.query('DELETE FROM sub_users WHERE owneruuid=$1 AND id=$2', [uuid, obj])
                break
            case UserAction.log: //FIXME: HOLY SHIT YOU ARE DUMB
                try {
                    let logInfo = await client.query(`SELECT history_${Number(obj)} WHERE owneruuid=$1`, [uuid]).then(e => e.rows)

                    ws.send(JSON.stringify([UserAction.log, ...logInfo]))
                    break
                }
                catch (e) {
                    console.debug(e)
                }

                activeUser.logSubuserID = Number(obj)
        }
    })
})
