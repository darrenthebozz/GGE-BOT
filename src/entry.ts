import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { Worker } from 'node:worker_threads'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import http from 'node:http'
import util from 'node:util'
import EmbeddedPostgres from 'embedded-postgres'
import { WebSocketServer, WebSocket } from 'ws'
import express from 'express'
import { safeParse } from 'secure-json-parse'
//@ts-ignore
import { handler as ssrHandler } from '@frontend/dist/server/entry.mjs'
import IterableWeakMap from '@modules/IterableWeakMap.js'
import UserAction from '@modules/CUserAction.js'
import EventEmitter from '@modules/EventEmitter.js'
import userDefaults from '@modules/userDefaults.js'
import exampleConfig from '@bot/ggeConfig.json' with { type: 'json' }
//@ts-ignore
import sqlInit from '@bot/init.sql' with { type: 'text' }
import type { IUser, IBotConfig, ILog, IUserEvents } from '@bot/types.d.ts'
import { setTimeout } from 'node:timers/promises'

const workingPath = join(tmpdir(), 'ggeBot')
const configPath = join(workingPath, "ggeConfig.json")
try { await mkdir(join(workingPath, "items"),  { recursive : true }) } 
catch (e) { 
    console.debug(e) }
try { 
    const userConfig = Object.assign(exampleConfig, JSON.parse(await readFile(configPath, 'utf-8')) as Partial<typeof exampleConfig>)
    var config = Object.assign(userConfig, { url : new URL(userConfig.url) })
}
catch(e) {
    try { await writeFile(configPath, JSON.stringify(exampleConfig)) }
    catch(e) {
        console.error("Could not create a config at workingPath.\n", e)
        process.exit(1)
    }    
    config = Object.assign(exampleConfig, { url : new URL(exampleConfig.url) })
}

console.debug = config.debug ? console.debug : () => { }

export const address = new URL(`ws://127.0.0.1:${config.url.port}`)
console.log("creating db")
const pg = new EmbeddedPostgres({
    databaseDir : join(workingPath, './db'),
    port: config.postgresPort,
    persistent: true,
    onLog: config.postgresDebug ? console.debug : () => { }
})
const itemsCacheExpire = 60 * 30 * 1000
let databaseInitialised = false
let itemsVersion = await readFile(join(workingPath, "./items/versionInfo.json"))
    .then(o => JSON.parse(o.toString())?.version["@value"]).catch(({}) => "")
let itemsLastUpdate = NaN 

console.log(workingPath)
try { await pg.initialise(); databaseInitialised = true } catch (e) { console.debug(e) }
await pg.start()


export const client = await pg.getPgClient().connect()
const userEvents = new EventEmitter<IUserEvents>()
interface ActiveUser { logSubuserID?: number, ws: WebSocket }
const activeUsers: { [key: string]: IterableWeakMap<WebSocket, ActiveUser> | undefined } = {}
const startBot = async (id: number, owneruuid: string) => {
    if (isNaN(itemsLastUpdate) || itemsLastUpdate - Date.now() + itemsCacheExpire < 0) {
        const currentItemVersion = await fetch('https://empire-html5.goodgamestudios.com/default/items/ItemsVersion.properties').then(o => o.text())

        if (itemsVersion != currentItemVersion) {
            const response = await fetch(`https://empire-html5.goodgamestudios.com/default/items/items_v${currentItemVersion.match(new RegExp(/(?!.*=).*/))![0]}.json`).then(a => a.json())
            
            for (const [key, value] of Object.entries(response))
                if (/^[A-Za-z\_]+$/.test(key))
                    await writeFile(join(workingPath, `./items/${key}.json`), JSON.stringify(value))

            itemsVersion = currentItemVersion
            itemsLastUpdate = Date.now()
        }
        
        new Worker(new URL("bot", import.meta.url), { workerData: { id, owneruuid, workingPath, } satisfies IBotConfig })
    }
}

if (databaseInitialised)
    await client.query(sqlInit)
await client.query(`LISTEN sub_user_update; LISTEN history_update; LISTEN sub_user_delete`)
client.on('notification', ({ channel, payload }: any) => userEvents.emit(channel, payload))

userEvents.on('history_update', payload => {
    const { id, owneruuid, data, loglevel, timestamp } = JSON.parse(payload) as ILog & { id : number, owneruuid : string }

    activeUsers[owneruuid]?.forEach(({ ws, logSubuserID }) =>
        id == logSubuserID && ws.send(JSON.stringify([UserAction.log, { timestamp, data, loglevel }])))
})
userEvents.on('sub_user_update', payload => {
    const [oldUser, newUser] = JSON.parse(payload) as [Partial<IUser> & { [key : string] : any}, IUser & { [key : string] : any}]
    const userChanges = (oldUser ? Object.entries(oldUser).reduce((obj: any, [key, value]) =>
        (newUser[key] != value && (obj[key] = newUser[key]), obj), {}) : newUser) as Partial<IUser>
    
    if(util.isDeepStrictEqual(oldUser.plugins, newUser.plugins))
        delete userChanges.plugins

    userChanges.id = newUser.id

    if (userChanges.state == true)
        startBot(newUser.id, newUser.owneruuid)
    
    if(Object.keys(userChanges).length == 1) //FIX?
        return

    Array.from(activeUsers[newUser.owneruuid]?.keys() ?? []).forEach(ws =>
        ws.send(JSON.stringify([UserAction.change, userChanges])))
})
userEvents.on('sub_user_delete', payload => {
    const [id, owneruuid] = JSON.parse(payload) as [string, string]

    Array.from(activeUsers[owneruuid]?.keys() ?? []).forEach(ws =>
        ws.send(JSON.stringify([UserAction.delete, Number(id)])))
})
const app = express().use('/', express.static('frontend/dist/client/')).use(ssrHandler)
export const wss = new WebSocketServer({ noServer: true })
wss.on('connection', async (ws, { headers }) => {
    const uuid = headers.cookie?.split('; ').find(e => e.startsWith('uuid='))?.substring(5, Infinity)
    if (!uuid || !await client.query('Select uuid from users WHERE uuid=$1', [uuid]).then((r: any) => r.rows[0]?.uuid))
        return ws.close(4000)

    const activeUser = { ws } as ActiveUser

    activeUsers[uuid] ??= new IterableWeakMap()
    activeUsers[uuid].set(ws, activeUser)

    ws.send(JSON.stringify([UserAction.get, ...await client.query('Select name, plugins, state, serverType, serverID, id from sub_users WHERE owneruuid=$1', [uuid]).then((a: any) => a.rows)]))

    ws.addEventListener("message", async ({ data })  => {
        const [action, obj]: [number, any] = safeParse(data.toString())

        switch (action) {
            case UserAction.change:
                if (!obj.id) {
                    const userChanges = Object.create({ ...structuredClone(userDefaults), ...obj }) as IUser
                    userChanges.plugins = Object.create({ ...structuredClone(userDefaults.plugins), ...userChanges.plugins })
                    client.query('INSERT INTO sub_users(name, loginToken, plugins, serverType, serverID, owneruuid) VALUES($2,$3,$4,$5,$6,$1)',
                        [uuid, userChanges.name, userChanges.logintoken, {}, userChanges.servertype, userChanges.serverid])
                    break
                }

                let i = 3
                client.query("UPDATE sub_users SET " + (
                    (obj.loginToken ? `loginToken=$${i++},` : '') +
                    (obj.plugins ? `plugins=$${i++},` : '') +
                    (obj.state != undefined ? `state=$${i++},` : '')
                ).replace(/\,$/, '') + " WHERE owneruuid=$1 AND id=$2", [uuid, ...Object.values(obj)])
                break
            case UserAction.delete:
                client.query('DELETE FROM sub_users WHERE owneruuid=$1 AND id=$2', [uuid, obj])
                break
            case UserAction.log:
                if (activeUser.logSubuserID = Number(obj))
                    ws.send(JSON.stringify([UserAction.log,
                    ...(await client.query('SELECT json_agg(logs) AS logs FROM sub_users WHERE owneruuid=$1 AND id=$2', [uuid, activeUser.logSubuserID]).then(e => e.rows?.[0]?.logs ?? []))]))
                break
        }
    })
})
http.createServer({}, app).listen(config.url.port).on('upgrade', (req, socket, head) => wss.handleUpgrade(req, socket, head, socket =>
    wss.emit('connection', socket, req)))

client.query('Select id, state, owneruuid from sub_users').then((r: any) => r.rows.forEach(({ id, state, owneruuid }: { id: number, state: boolean, owneruuid: string }) =>
    state ? startBot(id, owneruuid) : undefined))

console.log("Started.")