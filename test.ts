import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { rm } from 'node:fs/promises'
import WebSocket from 'ws'
import CUserAction from './modules/CUserAction.ts' 
import EventEmitter from 'node:events'

const workingPath = join(tmpdir(), 'ggeBot')

await rm(workingPath, { recursive: true, force: true })

const { address } = await import('./main.ts')
 
const { uuid, status } = await fetch(`http://${address.host}/signup`, {
    method: "POST",
    body: JSON.stringify({ name : "test", password : "tesnt" }),
    headers : {

        "origin" : "http://localhost:8080"
    }
}).then(async r => ({ uuid: await r.text(), status: r.status }));

if(status != 201) {
    console.log(uuid)
    process.exit(0)
    debugger
}

const ws = new WebSocket(address, {
    headers : {
        cookie: `uuid=${uuid}`
    }
})

ws.addEventListener("open", () => {
    ws.send(JSON.stringify([CUserAction.add, {
        name: "test",
        loginToken : "test",
        plugins: {},
        serverType: 'default',
        server: 1
    }]))
})
const messageHandler = new EventEmitter()
ws.addEventListener("message", event => {
    const obj = JSON.parse(event.data.toString())
    messageHandler.emit(obj[0],obj[1])
})

messageHandler.once(CUserAction.change.toString(), (obj : any) => {
    ws.send(JSON.stringify([CUserAction.change, { id: obj.id, state: true }]))
})
ws.addEventListener("close", obj => {
    debugger
})