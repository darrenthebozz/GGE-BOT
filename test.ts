import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { rm } from 'node:fs/promises'
import WebSocket from 'ws'
import CUserAction from './modules/CUserAction.ts'
import EventEmitter from 'node:events'
import assert from 'node:assert/strict'
import test from 'node:test'
import type { ILog, IUser } from './types.d.ts'
const workingPath = join(tmpdir(), 'ggeBot')

await rm(workingPath, { recursive: true, force: true })

const { address } = await import('./main.ts')

console.log(`Address: http://${address.host}`)

const { uuid, status } = await new Promise(resolve => test("Creating account", { timeout: 10000 },
    async () => resolve(await fetch(`http://${address.host}/signup`, {
        method: "POST",
        signal: AbortSignal.timeout(10000),
        body: JSON.stringify({ name: "test", password: "tesnt" })
    }).then(async r => ({ uuid: await r.text(), status: r.status }))))) as { uuid: string, status: number }

await test("Created account", () => assert.strictEqual(status, 201))

const ws = new WebSocket(address, { headers: { cookie: `uuid=${uuid}` } })
const messageHandler = new EventEmitter()

await test("Open WS connection", { timeout: 10000 }, () => new Promise(resolve => {
    ws.once("open", resolve)

    ws.addEventListener("message", ({ data }) =>
        messageHandler.emit(...JSON.parse(data.toString()) as [string, any]))

    ws.addEventListener("close", obj => {
        throw new Error("Websocket closed early")
    })
}))

await test("Login", { timeout: 10000 }, () => new Promise(resolve => messageHandler.once(CUserAction.get.toString(), resolve)))
let user = undefined as unknown as IUser
await test("Create User", { timeout: 10000 }, () => new Promise(resolve => {
    const partialUser = {
        name: "test",
        logintoken: "test",
        plugins: {
            test: {
                state: true
            }
        },
        servertype: 'default',
        serverid: 1
    } satisfies Omit<Omit<Omit<IUser, 'id'>, 'owneruuid'>, 'state'>

    ws.send(JSON.stringify([CUserAction.add, partialUser]))

    messageHandler.once(CUserAction.change.toString(), async (_user: IUser) => {
        user = _user
        assert.strictEqual(partialUser.name, user.name)
        assert.strictEqual(JSON.stringify(partialUser.plugins), JSON.stringify(user.plugins))
        assert.strictEqual(partialUser.servertype, user.servertype)
        assert.strictEqual(partialUser.serverid, user.serverid)

        resolve()
    })
}))

await test("Change User State", { timeout: 10000 }, () => new Promise(resolve => {
    ws.send(JSON.stringify([CUserAction.change, { id: user.id, state: true }]))
    messageHandler.once(CUserAction.change.toString(), resolve)
}))
messageHandler.on(CUserAction.log.toString(),
        (...logs: ILog[]) => logs.forEach(_log => console.log(_log.data)))
const assertLog = (log: string) => new Promise<void>((resolve, reject) => {
    const timeout = 10000
    const timer = setTimeout(() => {
        reject(new Error(`Promise timed out after ${timeout} ms`));
    }, timeout)
    messageHandler.on(CUserAction.log.toString(),
        (...logs: ILog[]) => logs.forEach(_log => {
            if (_log.data[3] != log)
                return
            clearTimeout(timer)
            resolve(undefined)
        }))
})

await test("Get log", { timeout: 10000 }, async s => {
    ws.send(JSON.stringify([CUserAction.log, 1]))
    await Promise.allSettled([
        s.test("LOAD", a => assertLog(a.name)),
        // s.test("UNLOAD", a => assertLog(a.name)),
        // s.test("RELOADPLUGIN", a => assertLog(a.name)),
        // s.test("UNLOADPLUGIN", a => assertLog(a.name))
    ])
})

await test("Delete User", { timeout: 10000 }, () => new Promise(resolve => {
    ws.send(JSON.stringify([CUserAction.delete, 1]))

    messageHandler.once(CUserAction.delete.toString(), (id: number) => {
        assert.strictEqual(id, 1)
        resolve()
    })
})).then(() => setTimeout(() => process.exit(0), 5000))