process.on("uncaughtException", console.error)

import { workerData } from "node:worker_threads"
import { getCallSites } from "node:util"
import path from "node:path"
import { EventEmitter } from "node:events"
import { RateLimiter } from "limiter"
import client from './modules/database.ts'

const timeoutMultiplier = 1
const port = 3001

const events = new EventEmitter<(...any: any[]) => void>()
const { id, owneruuid, gameServer, gameURL }:
    { id: number, owneruuid: string, gameServer: string, gameURL: string } = workerData

const restart = (...str: string[]) => {
    events.emit("unload")
    console.error(...str)
    process.exit(0)
}
const close = (...str: string[]) => {
    events.emit("unload")
    console.error(...str)
    process.exit(0)
}

function mngLog(logLevel: "INFO" | "WARNING" | "ERROR" | "DEBUG", ...msg: Array<any>) {
    const fileName = path.basename(getCallSites(6)[2]?.scriptName).slice(0, -3)
    const message = ['[', fileName, '] ', ...(msg.map(m => m instanceof Error ? m.message : String(m)))]

    client.query(`INSERT INTO history_${id} (sequence, timestamp, data, logLevel, owneruuid) VALUES (nextval('history_sequence_${id}'), default, $1, $2, $3) 
                 ON CONFLICT (sequence) DO UPDATE SET timestamp = now(), data = $1, logLevel = $2;`, [message, logLevel, owneruuid])
}

console.log = console.info = (...msg) => mngLog("INFO", msg)
console.warn = (...msg) => mngLog("WARNING", msg)
console.error = (...msg) => mngLog("ERROR", msg)
console.debug = (...msg) => mngLog("DEBUG", msg)

console.log("Starting Bot")

const err = await fetch(`/err:${port}`).then(a => a.json()) as { [key: string]: string }
const ws = new WebSocket(`wss://${gameURL}`)

ws.onopen = () => ws.send('<msg t="sys"><body action="verChk" r="0"><ver v="166"/></body></msg>')
ws.onerror = () => close("webSocketError")
ws.onclose = () => close("webSocketClosed")

const xtHandler = new EventEmitter<(obj: string | object, result: string | number) => void>()
ws.onmessage = ({ data }) => {
    let message = data.toString() as string

    if (message[0] == "<") {
        if (message == "<msg t='sys'><body action='apiOK' r='0'></body></msg>")
            ws.send(`<msg t="sys"><body action="login" r="0"><login z="${gameServer}"><nick><![CDATA[]]></nick><pword><![CDATA[undefined%en%0]]></pword></login></body></msg>`)
        else if (message == "<msg t='sys'><body action='joinOK' r='1'><pid id='0'/><vars /><uLs r='1'></uLs></body></msg>") {
            ws.send('<msg t="sys"><body action="roundTrip" r="1"></body></msg>')
            sendXT("vck", `undefined%web-html5%<RoundHouseKick>%${(Math.random() * Number.MAX_VALUE).toFixed()}`)
        }
        return
    }
    let [, , cmd, , _result, obj] = message.split("%") as [any, any, string, any, number, string]
    const result = err[_result] ?? String(_result)

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

const sendXT = (cmdName: string, paramObj: object | String) => limiter.removeTokens(1).then(() =>
    ws.send(
        `%xt%${gameServer}%${cmdName}%1%${paramObj instanceof String ? paramObj : JSON.stringify(paramObj)}%`))

let maxTimeouts = 8
let importantErrors = 0

const waitForResult = (key: string, timeout: number, func?: (data: object | string, result: string) => boolean) =>
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
            }, timeout * timeoutMultiplier)
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

