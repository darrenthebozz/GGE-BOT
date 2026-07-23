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

console.debug = 0 ? console.debug : () => { }
const workingPath = join(tmpdir(), 'ggeBot')
try { await mkdir(workingPath) } catch (e) { console.debug(e) }
const databaseDir = join(workingPath, './db')
const pg = new EmbeddedPostgres({
    databaseDir,
    port: 5436,
    persistent: true,
    onLog: console.debug
})
let databaseInitialised = false

console.log(workingPath)
try { await pg.initialise(); databaseInitialised = true } catch (e) { console.debug(e) }
await pg.start()

const client = await pg.getPgClient().connect()
const subUserEvents = new EventEmitter()
const activeUsers: { [key: string]: IterableWeakMap<WebSocket> | undefined } = {}

if (databaseInitialised)
    await client.query(await readFile('./init.sql').then(o => o.toString()))
await client.query(`LISTEN sub_user_update`)
client.addListener('notification', ({ channel, payload }: any) => subUserEvents.emit(channel, payload))
subUserEvents.addListener('sub_user_update', payload => {
    const [oldUser, newUser] = JSON.parse(payload) as [IUser, IUser]
    const userChanges = oldUser ? Object.entries(oldUser).reduce((obj: any, [key, value]) =>
        (newUser[key] != value && (obj[key] = newUser[key]), obj), {}) : newUser

    userChanges.id = newUser.id

    if (userChanges.state == true)
        new Worker('./ggeBot.ts', { workerData: newUser.id })

    activeUsers[newUser.owneruuid]?.forEach(ws => {
        ws.send(JSON.stringify([UserAction.change, userChanges]))
    })
})

await client.query('Select id, state from sub_users').then((r : any) => r.rows.forEach(({ id, state }: { id: number, state: boolean }) =>
    state ? new Worker('./ggeBot.ts', { workerData: id }) : undefined))

const wss = new WebSocketServer({ noServer: true })
const app = express().use('/', express.static('frontend/dist/client/')).use(ssrHandler)

http.createServer({}, app).listen(8080).on('upgrade', (req, socket, head) => wss.handleUpgrade(req, socket, head, socket =>
    wss.emit('connection', socket, req)))

wss.addListener('connection', async (ws, { headers }) => {
    const uuid = headers.cookie?.split('; ').find(e => e.startsWith('uuid='))?.substring(5, Infinity)

    if (!uuid || !await client.query('Select uuid from users WHERE uuid=$1', [uuid]).then((r : any) => r.rows[0]?.uuid))
        return ws.close(4000)

    activeUsers[uuid] ??= new IterableWeakMap()
    activeUsers[uuid].set(ws, ws)

    ws.send(JSON.stringify([UserAction.get, ...await client.query('Select name, plugins, state, serverType, server, id from sub_users WHERE ownerUUID=$1', [uuid]).then((q: any) => q.rows)]))
    ws.addEventListener("message", async ({ data }) => {
        const [action, obj]: [number, any] = safeParse(data.toString())

        switch (action) {
            case UserAction.add:
                await client.query('INSERT INTO sub_users(name, loginToken, plugins, serverType, server, ownerUUID) VALUES($2,$3,$4,$5,$6,$1)',
                    [uuid, ...Object.values(obj)])
                break
            case UserAction.change: {
                let i = 3
                await client.query("UPDATE sub_users SET " + (
                        (obj.name       ? `name=$${i++},` : '') +
                        (obj.loginToken ? `loginToken=$${i++},` : '') + 
                        (obj.plugins    ? `plugins=$${i++},` : '') + 
                        (obj.state      ? `state=$${i++},` : '') +
                        (obj.serverType ? `serverType=$${i++},` : '') +
                        (obj.server     ? `server=$${i++}` : '')
                ).replace(/\,$/, '') + " WHERE ownerUUID=$1 AND id=$2",
                    [uuid, ...Object.values(obj)])
                }
                break
            case UserAction.delete:
                await client.query('DELETE FROM sub_users WHERE ownerUUID=$1 AND id=$2', [uuid, obj])
                break
        }
    })
})