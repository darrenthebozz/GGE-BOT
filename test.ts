import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { rm } from 'node:fs/promises'
import WebSocket from 'ws'
import CUserAction from './modules/CUserAction.ts' 
import EventEmitter from 'node:events'
import assert from 'node:assert/strict'
import test from 'node:test'
import type ILog from './modules/ILog.ts'
import type IUser from './modules/IUser.ts'

const workingPath = join(tmpdir(), 'ggeBot')

await rm(workingPath, { recursive: true, force: true })

const { address } = await import('./main.ts')

console.log(`Address: http://${address.host}`)

const { uuid, status } = await new Promise(resolve => test("Creating account", { timeout: 10000 }, 
    async () => resolve(await fetch(`http://${address.host}/signup`, {
        method: "POST",
        signal : AbortSignal.timeout(10000),
        body: JSON.stringify({ name: "test", password: "tesnt" })
    }).then(async r => ({ uuid: await r.text(), status: r.status }))))) as { uuid : string, status : number }

test("Created account", () => assert.strictEqual(status, 201))

const ws = new WebSocket(address, { headers: { cookie: `uuid=${uuid}` } })
const messageHandler = new EventEmitter()

test("Open WS connection", { timeout: 10000 }, () => new Promise(resolve => {
    ws.once("open", resolve)

    ws.addEventListener("message", ({ data }) =>
        messageHandler.emit(...JSON.parse(data.toString()) as [string, any]))

    ws.addEventListener("close", obj => {
        throw new Error("Websocket closed early")
    })
}))

test("Login", { timeout: 10000 }, () => new Promise(resolve => messageHandler.once(CUserAction.get.toString(), resolve)))

test("Create User", { timeout: 10000 }, () => new Promise(resolve => {
    const user = {
        name: "test",
        loginToken: "test",
        plugins: {},
        servertype: 'default',
        server: 1
    }
    
    ws.send(JSON.stringify([CUserAction.add, user]))

    messageHandler.once(CUserAction.change.toString(), (user2: IUser) => {
        assert.strictEqual(user.name, user2.name)
        assert.strictEqual(JSON.stringify(user.plugins), JSON.stringify(user2.plugins))
        assert.strictEqual(user.servertype, user2.servertype)
        assert.strictEqual(user.server, user2.server)

        ws.send(JSON.stringify([CUserAction.change, { id: user2.id, state: true }]))
        resolve()
    })
}))

test("Get log", { timeout: 10000 }, () => new Promise(resolve => {
    ws.send(JSON.stringify([CUserAction.log, 1]))
    messageHandler.once(CUserAction.log.toString(), resolve)
}))

test("Delete User", { timeout: 10000 }, () => new Promise(resolve => {
    ws.send(JSON.stringify([CUserAction.delete, 1]))

    messageHandler.once(CUserAction.delete.toString(), (id : number) => {
        assert.strictEqual(id, 1)
        resolve()
    })
})).then(() => setTimeout(() => process.exit(0), 5000))