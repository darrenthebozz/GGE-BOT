import { mkdir, readFile, writeFile } from 'node:fs/promises'
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
import UserAction from './modules/CUserAction.ts'
import exampleConfig from './ggeConfig.json' with { type: 'json' }
import type { IUser, IBotConfig, ILog } from './types.ts'

const workingPath = join(tmpdir(), 'ggeBot')
const configPath = join(workingPath, "ggeConfig.json")
try { await mkdir(workingPath) } catch (e) { console.debug(e) }
try { 
    var config = JSON.parse(await readFile(configPath, 'utf-8')) as Partial<typeof exampleConfig> 
}
catch(e) {
    try {
        await writeFile(configPath, JSON.stringify(exampleConfig))
    }
    catch(e) {
        console.error("Could not create a config at workingPath.\n", e)
        process.exit(1)
    }    
    config = exampleConfig
}
export const address = new URL(`ws://127.0.0.1:${config.port}`)

console.debug = config.debug ? console.debug : () => { }

const databaseDir = join(workingPath, './db')
const pg = new EmbeddedPostgres({
    databaseDir,
    port: config.postgresPort,
    persistent: true,
    onLog: config.postgresDebug ? console.debug : () => { }
})
let databaseInitialised = false

console.log(workingPath)
try { await pg.initialise(); databaseInitialised = true } catch (e) { console.debug(e) }
await pg.start()

export const client = await pg.getPgClient().connect()
const subUserEvents = new EventEmitter()
interface ActiveUser { logSubuserID?: number, ws: WebSocket }
const activeUsers: { [key: string]: IterableWeakMap<WebSocket, ActiveUser> | undefined } = {}

if (databaseInitialised)
    await client.query(await readFile('./init.sql').then(o => o.toString()))
await client.query(`LISTEN sub_user_update; LISTEN history_update; LISTEN sub_user_delete`)
client.addListener('notification', ({ channel, payload }: any) => subUserEvents.emit(channel, payload))

const startBot = async (id: number, owneruuid: string) => {
    try {
        await client.query(`
        CREATE SEQUENCE IF NOT EXISTS history_sequence_${id} MINVALUE 0 MAXVALUE 127 CYCLE;
        
        CREATE TABLE IF NOT EXISTS history_${id} (
        sequence  INTEGER PRIMARY key,
        timestamp TIMESTAMP NOT NULL DEFAULT now(),
        data      TEXT[] NOT NULL,
        logLevel  VerbosityLevel NOT NULL,
        owneruuid TEXT NOT NULL);
        
        CREATE OR REPLACE FUNCTION on_history_update_${id}()
        RETURNS TRIGGER AS $$
        BEGIN
        PERFORM pg_notify('history_update', '[' || '${id},' || row_to_json(NEW.*)::TEXT || ']');
        RETURN NEW;
        END $$ LANGUAGE PLPGSQL;

        CREATE OR REPLACE TRIGGER history_${id}
        AFTER INSERT OR UPDATE ON history_${id}
        FOR EACH ROW
        EXECUTE FUNCTION on_history_update_${id}();`)
    } catch (e) { console.debug(e) }
    new Worker('./bot.ts', { workerData: { id, owneruuid, port: address.port, workingPath } satisfies IBotConfig })
}

subUserEvents.addListener('history_update', payload => {
    const [id, log] = JSON.parse(payload) as [number, Partial<ILog>]
    const activeUser = activeUsers[log.owneruuid!]

    delete log.owneruuid
    delete log.sequence

    activeUser?.forEach(({ ws, logSubuserID }) =>
        id == logSubuserID && ws.send(JSON.stringify([UserAction.log, log])))
})
subUserEvents.addListener('sub_user_update', payload => {
    const [oldUser, newUser] = JSON.parse(payload) as [IUser, IUser]
    const userChanges = (oldUser ? Object.entries(oldUser).reduce((obj: any, [key, value]) =>
        (newUser[key] != value && (obj[key] = newUser[key]), obj), {}) : newUser) as Partial<IUser>

    userChanges.id = newUser.id

    if (userChanges.state == true)
        startBot(newUser.id, newUser.owneruuid)

    Array.from(activeUsers[newUser.owneruuid]?.keys() ?? []).forEach(ws =>
        ws.send(JSON.stringify([UserAction.change, userChanges])))
})
subUserEvents.addListener('sub_user_delete', payload => {
    const [id, owneruuid] = JSON.parse(payload) as [string, string]

    Array.from(activeUsers[owneruuid]?.keys() ?? []).forEach(ws =>
        ws.send(JSON.stringify([UserAction.delete, Number(id)])))
})
const app = express().use('/', express.static('frontend/dist/client/')).use(ssrHandler)
export const wss = new WebSocketServer({ noServer: true })
wss.addListener('connection', async (ws, { headers }) => {
    const uuid = headers.cookie?.split('; ').find(e => e.startsWith('uuid='))?.substring(5, Infinity)
    if (!uuid || !await client.query('Select uuid from users WHERE uuid=$1', [uuid]).then((r: any) => r.rows[0]?.uuid))
        return ws.close(4000)

    const activeUser = { ws } as ActiveUser

    activeUsers[uuid] ??= new IterableWeakMap()
    activeUsers[uuid].set(ws, activeUser)

    ws.send(JSON.stringify([UserAction.get, ...await client.query('Select name, plugins, state, serverType, serverID, id from sub_users WHERE owneruuid=$1', [uuid]).then((q: any) => q.rows)]))
    ws.addEventListener("message", async ({ data }) => {
        const [action, obj]: [number, any] = safeParse(data.toString())

        switch (action) {
            case UserAction.add:
                await client.query('INSERT INTO sub_users(name, loginToken, plugins, serverType, serverID, owneruuid) VALUES($2,$3,$4,$5,$6,$1)',
                    [uuid, ...Object.values(obj)])
                break
            case UserAction.change:
                let i = 3
                await client.query("UPDATE sub_users SET " + (
                    (obj.name ? `name=$${i++},` : '') +
                    (obj.loginToken ? `loginToken=$${i++},` : '') +
                    (obj.plugins ? `plugins=$${i++},` : '') +
                    (obj.state != undefined ? `state=$${i++},` : '') +
                    (obj.serverType ? `serverType=$${i++},` : '') +
                    (obj.serverID ? `serverID=$${i++}` : '')
                ).replace(/\,$/, '') + " WHERE owneruuid=$1 AND id=$2", [uuid, ...Object.values(obj)])
                break
            case UserAction.delete:
                await client.query('DELETE FROM sub_users WHERE owneruuid=$1 AND id=$2', [uuid, obj])
                break
            case UserAction.log:
                activeUser.logSubuserID = Number(obj)
                if (isNaN(activeUser.logSubuserID))
                    break
                try {
                    ws.send(JSON.stringify([UserAction.log,
                    ...(await client.query(`SELECT timestamp, data, logLevel from history_${activeUser.logSubuserID} WHERE owneruuid=$1`, [uuid]).then(e => e.rows))]))
                }
                catch (e) { console.debug(e) }
                break
        }
    })
})
http.createServer({}, app).listen(address.port).on('upgrade', (req, socket, head) => wss.handleUpgrade(req, socket, head, socket =>
    wss.emit('connection', socket, req)))

await client.query('Select id, state, owneruuid from sub_users').then((r: any) => r.rows.forEach(({ id, state, owneruuid }: { id: number, state: boolean, owneruuid: string }) =>
    state ? startBot(id, owneruuid) : undefined))