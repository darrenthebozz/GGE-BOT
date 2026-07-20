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

const UserAction = {
    add : 0,
    change : 1,
    delete : 2
}
interface User {
    id: number,
    ownerUUID: string,
    name: string,
    loginToken: string,
    plugins: { [key: string]: { state: boolean } & any }
    state: boolean,
    serverType: 'default' | 'horizon' | 'outerRealm' | 'outerRealm&horizon'
    server: number
    [key: string]: any
}

console.debug = 0 ? console.debug : () => { }
const workingPath = join(tmpdir(), 'ggeBot')

console.log(workingPath)
try { await mkdir(workingPath) } catch (e) { console.debug(e) }
const databaseDir = join(workingPath, './db')
const pg = new EmbeddedPostgres({
    databaseDir,
    port: 5436,
    persistent: true,
    onLog: console.debug
})

let databaseInitialised = false

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
    const [oldUser, newUser] = JSON.parse(payload) as [User, User]
    const userChanges = oldUser ? Object.entries(oldUser).reduce((obj: any, [key, value]) =>
    (newUser[key] != value && (obj[key] = newUser[key]), obj), {}) : newUser

    userChanges.id = newUser.id

    if (userChanges.state == true)
        new Worker('./ggeBot.ts', { workerData: newUser.id })

    activeUsers[newUser.ownerUUID]?.forEach(ws => ws.send([UserAction.change, userChanges]))
})

client.query('Select id, state from sub_users').then(({ rows }: any) => rows.forEach(({ id, state } : { id : number, state : boolean }) =>
    state ? new Worker('./ggeBot.ts', { workerData: id }) : undefined))

const getSubUser = (uuid: string, id?: number) => id == undefined ?
    client.query('Select * from sub_users WHERE ownerUUID=$1', [uuid]).then(({ rows }) => rows) as Promise<Array<User>> :
    client.query('Select * from sub_users WHERE ownerUUID=$1 AND id=$2', [uuid, id]).then(({ rows }) => rows?.[0]) as Promise<User>

const wss = new WebSocketServer({ noServer: true })
const app = express().use('/', express.static('frontend/dist/client/')).use(ssrHandler)

http.createServer({}, app).listen(8080).on('upgrade', (req, socket, head) => wss.handleUpgrade(req, socket, head, socket =>
    wss.emit('connection', socket, req)))

wss.addListener('connection', async (ws, { headers }) => {
    const uuid = headers.cookie?.split('; ').find(e => e.startsWith('uuid='))?.substring(5, Infinity)

    if (!uuid || !await getSubUser(uuid).then(u => u.length))
        return ws.close(4000)

    activeUsers[uuid] ??= new IterableWeakMap()
    activeUsers[uuid].set(ws, ws)

    ws.addEventListener("message", async ({ data }) => {
        const [action, obj]: [number, any] = safeParse(data.toString())

        switch (action) {
            case UserAction.add: {
                const { name, loginToken, plugins, serverType, server } = obj satisfies User as User

                await client.query('INSERT INTO sub_users(name, loginToken, plugins, serverType, server, ownerUUID) VALUES($1,$2,$3,$4,$5,$6)',
                    [name, loginToken, plugins, serverType, server, uuid])
                break
            }
            case UserAction.change: {
                const { name, loginToken, plugins, state, serverType, server, id } = Object.assign(await getSubUser(uuid, obj.id), obj satisfies User) as User

                await client.query('UPDATE sub_users SET name=$1, loginToken=$2, plugins=$3, state=$4, serverType=$5, server=$6, ownerUUID WHERE uuid=$7 AND id=$8',
                    [name, loginToken, plugins, state, serverType, server, uuid, id])
                break
            }
            case UserAction.delete:
                await client.query('DELETE FROM sub_users WHERE ownerUUID=$1 AND id=$2', [uuid, obj satisfies number])
                break
        }
    })
})
