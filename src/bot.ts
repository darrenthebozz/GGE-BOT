import '@bot/botOverrides'
import { readFile } from 'node:fs/promises'
import path, { join } from 'node:path'
import { getCallSites } from 'node:util'
import { RateLimiter } from 'limiter'
import client from '@modules/database'
import EventEmitter from '@modules/EventEmitter'
import createUserObject from '@modules/createUserObject'
import exampleConfig from '@bot/ggeConfig.json' with { type: 'json' }
import pluginConfig from '@bot/plugins/index'
import type { IBotConfig, IUser, IInstance, IUserEvents, IPlugin, IPluginOptionValueType } from '@bot/types.ts'
import { isSea } from 'node:sea'

const { id, workingPath, isTest } = await import("node:worker_threads").then(e => e.workerData as IBotConfig)
export const events = new EventEmitter<{
    unload: void
    load: void
    reloadPlugin: string
    unloadPlugin: string
}>()
const userEvents = new EventEmitter<IUserEvents>()
export const restart = (...str: string[]) => {
    events.emit("unload")
    if (str.length > 0)
        console.error(...str)
    try {
        ws?.close()
    }
    catch (e) {
        console.debug(e)
    }
    client?.end()
}
export const close = async (...str: string[]) => {
    events.emit("unload")
    if (str.length > 0)
        console.error(...str)
    try {
        ws?.close()
    }
    catch (e) {
        console.debug(e)
    }
    client?.end()
}

await client.query(`LISTEN sub_user_update; LISTEN sub_user_delete`)
client.addListener('notification', ({ channel, payload }) => userEvents.emit(channel, payload))

userEvents.on('sub_user_update', payload => {
    const [oldUser, newUser] = JSON.parse(payload) as [IUser & { [key: string]: any }, IUser & { [key: string]: any }]
    const userChanges = (oldUser ? Object.entries(oldUser).reduce((obj: any, [key, value]) =>
        (newUser[key] != value && (obj[key] = newUser[key]), obj), {}) : newUser) as Partial<IUser>

    userChanges.id = newUser.id
    if (userChanges.plugins) {
        // debugger
    }
    if (userChanges.state == false)
        close()

})

userEvents.on('sub_user_delete', close)

const err = await import('@bot/err.json', { with: { type: "json" } }).then(e =>
    e.default as typeof e.default & Record<string, undefined>)
const configPath = join(workingPath, "ggeConfig.json")
export const config = await readFile(configPath, 'utf-8').then(str => {
    const config = Object.assign(JSON.parse(str) as Partial<typeof exampleConfig>, exampleConfig)
    return Object.assign(config, { url: new URL(config.url) })
})
const instances = await fetch(`http://${config.url.hostname}:${isSea() ? config.url.port : 4321}/server`).then(a => a.json()) as IInstance[]
const { name, plugins, servertype, serverid, logintoken, state } =
    (await client.query('SELECT name, plugins, serverType, serverID, loginToken, state FROM sub_users WHERE id=$1', [id])
        .then(e => createUserObject(e.rows[0])))
const { server, zone } = instances.find(instance => instance.value == serverid)!
const ws = new WebSocket(`wss://${server}`)

export function getPluginOptions<T extends Omit<IPlugin, 'key'>>() {
    const pluginKey = getCallSites(6)[2]?.scriptName
    if (!pluginKey)
        throw new Error("Missing plugin key")

    const plugin = plugins[pluginKey]!
    return plugin as Omit<typeof plugin, "state"> as IPluginOptionValueType<T>
}

export const xtHandler = new EventEmitter<{ [key: string]: any }>()
if (!isTest) {
    ws.onopen = () => ws.send('<msg t="sys"><body action="verChk" r="0"><ver v="166"/></body></msg>')
    ws.onerror = () => close("webSocketError")
    ws.onclose = async () => {
        await client.query('UPDATE sub_users SET state=$2 WHERE id=$1', [id, false])
        await client.end()
    }
    ws.onmessage = async ({ data }) => {
        let message = await data.text()

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
        catch { }

        if (cmd == "gbd")
            for (const [key, value] of Object.entries(obj))
                xtHandler.emit(key, value, err[0])

        else if (result != 'ALL_OK' && !['rlu', 'core_pol', 'vck', 'gfl', 'lli'].includes(cmd))
            console.debug(cmd, result)
        xtHandler.emit(cmd, obj, result)
    }
}

const limiter = new RateLimiter({ tokensPerInterval: 5, interval: "sec" })
export const sendXT = (cmdName: string, paramObj: object | String) => limiter.removeTokens(1).then(() => {
    const msg = `%xt%${zone}%${cmdName}%1%${paramObj instanceof String ? paramObj : JSON.stringify(paramObj)}%`
    ws.send(msg)
})

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
function retry() {
    if (servertype != "default") {
        //TODO:
        client.query('SELECT name, plugins, serverType, serverID, loginToken FROM sub_users WHERE id=$1', [id])

        return sendXT("tlep", { TLT: logintoken })
    }
    sendXT("lli", {
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
    })
}

xtHandler.on("rlu", () => ws.send('<msg t="sys"><body action="autoJoin" r="-1"></body></msg>'))
xtHandler.on("vck", retry)
xtHandler.on("lli", async (obj, result) => {
    if (result == "LOGIN_COOLDOWN_ACTIVE") {
        console.log("retryLogin", obj.CD, "retryLoginSeconds")
        return setTimeout(retry, obj.CD * 1000)
    }

    if (result == "IS_BANNED") {
        console.log("retryLogin", obj.CD, "retryLoginSeconds")
        console.log("retryLogin", (obj.RS / 60 / 60).toFixed(2), "retryLoginHours")
        return setTimeout(retry, obj.RS * 1000)
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
        return setInterval(sendXT, 1000 * 60, "pin", "<RoundHouseKick>")
    }

    if (result == "INVALID_LOGIN_TOKEN" && loginAttempts++ < 30)
        retry()
    else close()
})

if (state == false)
    close()

Promise.allSettled(Array.from(Object.entries(plugins)).map(async ([key, object]) => {
    if (!object?.state)
        return

    console.log(JSON.stringify(pluginConfig))
    const pluginData = pluginConfig.find(e => `./${e.key}` == key)

    if (!pluginData)
        return console.warn(key, " missing")
    try {
        const filePath = path.parse(pluginData.key)
        console.log(pluginConfig)

        return (await import(`./plugins/${join(filePath.dir, filePath.name)}`))?.default?.()
    }
    catch (e) {
        console.warn(e)
    }
})).then(() => {
    console.log("Started")
    if (isTest) {
        events.emit("load")
    }
})
