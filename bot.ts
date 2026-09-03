import './botOverrides.ts'
import { readFile } from 'node:fs/promises'
import { join, normalize } from 'node:path'
import { getCallSites } from 'node:util'
import { RateLimiter } from 'limiter'
import client from './modules/database.ts'
import EventEmitter from './modules/EventEmitter.ts'
import exampleConfig from './ggeConfig.json' with { type: 'json' }
import type { IBotConfig, IUser, IInstance, IUserEvents } from './types.d.ts'

const { id, workingPath } = await import("node:worker_threads").then(e => e.workerData as IBotConfig)
export const events = new EventEmitter<{
    unload : void
    load : void
    reloadPlugin : string
    unloadPlugin : string
}>()
const userEvents = new EventEmitter<IUserEvents>()
export const restart = (...str: string[]) => {
    events.emit("unload")
    if (str.length > 0)
        console.error(...str)
    process.exit(0)
}
export const close = (...str: string[]) => {
    events.emit("unload")
    if (str.length > 0)
        console.error(...str)
    ws.close()
}

await client.query(`LISTEN sub_user_update; LISTEN sub_user_delete`)
client.addListener('notification', ({ channel, payload }) => userEvents.emit(channel, payload))

userEvents.on('sub_user_update', payload => {
    const [oldUser, newUser] = JSON.parse(payload) as [IUser & { [key: string]: any }, IUser & { [key: string]: any }]
    const userChanges = (oldUser ? Object.entries(oldUser).reduce((obj: any, [key, value]) =>
        (newUser[key] != value && (obj[key] = newUser[key]), obj), {}) : newUser) as Partial<IUser>

    userChanges.id = newUser.id
    if (userChanges.plugins) {
        debugger
    }

})
userEvents.on('sub_user_delete', close)

const err = await import('./err.json', { with: { type: "json" } }).then(e =>
    e.default as typeof e.default & Record<string, undefined>)
const configPath = join(workingPath, "ggeConfig.json")
export const config = await readFile(configPath, 'utf-8').then(str => {
    const config = Object.assign(JSON.parse(str) as Partial<typeof exampleConfig>, exampleConfig)
    return Object.assign({ url : new URL(config.url)}, config)
})
const instances = await fetch(config.url.toString() + "/server").then(a => a.json()) as IInstance[]
const { name, plugins, servertype, serverid, logintoken } =
    (await client.query('SELECT name, plugins, serverType, serverID, loginToken FROM sub_users WHERE id=$1', [id])
        .then(e => e.rows[0] as IUser))
const { server, zone } = instances.find(instance => instance.value == serverid)!
const ws = new WebSocket(`wss://${server}`)
export const xtHandler = new EventEmitter<{ [key : string] : any}>()

ws.onopen = () => ws.send('<msg t="sys"><body action="verChk" r="0"><ver v="166"/></body></msg>')
ws.onerror = () => close("webSocketError")
ws.onclose = () => close("webSocketClosed")
ws.onmessage = ({ data }) => {
    let message = data.toString() as string

    if (message[0] == "<") {
        if (message == "<msg t='sys'><body action='apiOK' r='0'></body></msg>")
            ws.send(`<msg t="sys"><body action="login" r="0"><login z="${zone}"><nick><![CDATA[]]></nick><pword><![CDATA[undefined%en%0]]></pword></login></body></msg>`)
        else if (message == "<msg t='sys'><body action='joinOK' r='1'><pid id='0'/><vars /><uLs r='1'></uLs></body></msg>") {
            ws.send('<msg t="sys"><body action="roundTrip" r="1"></body></msg>')
            sendXT("vck", `undefined%web-html5%<RoundHouseKick>%${(Math.random() * Number.MAX_VALUE).toFixed()}`)
        }
        return
    }
    let [, , cmd, , _result, obj] = message.split("%") as [any, any, string, any, number, string]
    const result = err[String(_result)] ?? String(_result)
    try { obj = JSON.parse(obj) }
    catch (e) { console.debug(e) }

    if (cmd == "gbd")
        for (const [key, value] of Object.entries(obj))
            xtHandler.emit(key, value, err[0])

    else if (!["rlu", "core_pol"].includes(cmd))
        console.debug(result, cmd)
    xtHandler.emit(cmd, obj, result)
}

const limiter = new RateLimiter({ tokensPerInterval: 5, interval: "sec" })
export const sendXT = (cmdName: string, paramObj: object | String) => limiter.removeTokens(1).then(() =>
    ws.send(
        `%xt%${zone}%${cmdName}%1%${paramObj instanceof String ? paramObj : JSON.stringify(paramObj)}%`))

let maxTimeouts = 8
let importantErrors = 0
let loginAttempts = 0

export const waitForResult = (key: string, timeout: number, func?: (data: object | string, result: string) => boolean) =>
    new Promise<{ data: object | string, result: string }>((resolve, reject) => {
        if (timeout == undefined)
            reject(`waitForResult: No timeout specified`)

        let result = "TIMED_OUT"

        if (timeout > 0) {
            var timer = setTimeout(() => {
                xtHandler.removeListener(key, helperFunction)

                if (result == "TIMED_OUT" && maxTimeouts-- == 5)
                    return restart("restartReason", "Too many timeouts.")

                console.warn(key, result)

                reject(result)
            }, timeout * (config.timeoutMultiplier ?? 1))
        }

        const helperFunction = (data: object | string, _result: string) => {
            if (result == "TIMED_OUT")
                result ??= _result

            if (result != "ALL_OK") {
                console.warn(key, result)
                if (["LORD_IS_USED", "ATTACK_TOO_MANY_UNITS", "ATTACK_TOO_MANY_UNITS", "MISSING_UNITS"].includes(result))
                    importantErrors++

                if (importantErrors == 8)
                    return close("closedReason", "tooManyImportantErrors")
                if (["CANT_START_NEW_ARMIES", "MOVEMENT_HAS_NO_UNITS"].includes(result))
                    return close("closedReason", "Too many errors")
            }

            if (func && !func(data, result))
                return

            xtHandler.removeListener(key, helperFunction)
            clearInterval(timer)
            resolve({ data, result })
        }

        xtHandler.addListener(key, helperFunction)
    })
async function retry() {
    if (servertype != "default") {
        client.query('SELECT name, plugins, serverType, serverID, loginToken FROM sub_users WHERE id=$1', [id])

        return sendXT("tlep", JSON.stringify({ TLT: logintoken }))
    }
    sendXT("lli", JSON.stringify({
        "CONM": 350,
        "RTM": 57,
        "ID": 0,
        "PL": 1,
        "NOM": name,
        "LT": logintoken,
        "LANG": "en",
        "DID": "0",
        "AID": "17254677223212351",
        "KID": "",
        "REF": "https://empire.goodgamestudios.com",
        "GCI": "",
        "SID": 9,
        "PLFID": 1
    }))
}

xtHandler.on("rlu", () => ws.send('<msg t="sys"><body action="autoJoin" r="-1"></body></msg>'))
// xtHandler.on("vck", retry)
xtHandler.on("lli", async (obj, result) => {
    if (result == "LOGIN_COOLDOWN_ACTIVE") {
        console.log("retryLogin", obj.CD, "retryLoginSeconds")
        setTimeout(retry, obj.CD * 1000)
        return
    }

    if (result == "IS_BANNED") {
        console.log("retryLogin", obj.CD, "retryLoginSeconds")
        console.log("retryLogin", (obj.RS / 60 / 60).toFixed(2), "retryLoginHours")
        setTimeout(retry, obj.RS * 1000)
        return
    }

    if (result == "ALL_OK") {
        const timer = setTimeout(() => {
            console.warn("loggedIn", "loggedInWithoutEventData")
            console.warn("featuresMightNotWork")
            events.emit("load")
        }, 30 * 1000 * (config.timeoutMultiplier ?? 1))

        xtHandler.once("sei", () => {
            console.log("loggedIn")
            setTimeout(events.emit, 4500, "load")
            clearTimeout(timer)
        })
        setInterval(sendXT, 1000 * 60, "pin", "<RoundHouseKick>").unref()
        return
    }

    if (result == "INVALID_LOGIN_TOKEN" && loginAttempts++ < 30)
        retry()
    else close()
})
export function getPluginOptions<T>() {
    const name = getCallSites(6)[2]?.scriptName
    return plugins.find(e=> e.filePath == name)?.options
}
await Promise.allSettled(plugins?.map(({ state, filePath }) => 
        state ? import(`./plugins/${normalize(filePath)}.ts`) : undefined))

console.log("Starting Bot")

console.log(name)
console.log(server)
console.log(zone)

events.emit("load")