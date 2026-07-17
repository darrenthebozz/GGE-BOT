import { isMainThread, workerData : botConfig, parentPort } from "node:worker_threads"
if (isMainThread)
    throw new Error("Run as worker")

process.on("uncaughtException", console.error)

import { getCallSites } from "node:util"
import EventEmitter from "node:events"
import path from "node:path"

import { RateLimiter } from "limiter"
import { I18n } from "i18n"

import ggeConfig from "./ggeConfig.json"

const limiter = new RateLimiter({ tokensPerInterval: 5, interval: "sec" })
const events = new EventEmitter()
export const xtHandler = new EventEmitter()
const i18n = new I18n({
    locales: ['en', 'de', 'ar', 'fi', 'he', 'hu', 'pl', 'ro', 'tr', 'cs', 'nl', 'fr'],
    // directory: path.join(__dirname, ""), TODO: FIXME
    updateFiles: false
})
const _console = console

function mngLog(logLevel, msg) {
    let message = [Date.now(), ['[', `${path.basename(getCallSites(6)[2]?.scriptName).slice(0, -3)}`, '] ', ...(msg.map(m => m instanceof Error ? m.message : m))]]

    //add to table as [message]
    parentPort.postMessage([ActionType.GetLogs, logLevel, message])
}

if (!botConfig.internalWorker) {
    console = {}
    console.log = (...msg) => mngLog(0, msg)
    console.info = (...msg) => mngLog(0, msg)
    console.warn = (...msg) => mngLog(1, msg)
    console.error = (...msg) => mngLog(2, msg)
    console.debug = ggeConfig.debug ? _console.debug : _ => { }
    console.trace = _console.trace
}

export const sendXT = (cmdName, paramObj) =>
    limiter.removeTokens(1).then(() => ws.send(`%xt%${botConfig.gameServer}%${cmdName}%1%${paramObj}%`))

let importantErrors = 0
let timedOut = 0
/**
 * 
 * @param {string} key 
 * @param {number} timeout 
 * @param {function(object,number)} func 
 * @returns {Promise<[obj: object, result: Number]>}
 */
export const waitForResult = (key, timeout, func) => new Promise((resolve, reject) => {
    if (timeout == undefined)
        reject(`waitForResult: No timeout specified`)

    func ??= _ => true

    let timer
    let result
    const checkForIssues = () => {
        if (["LORD_IS_USED", "ATTACK_TOO_MANY_UNITS", "ATTACK_TOO_MANY_UNITS", "MISSING_UNITS"].includes(err[result]))
            importantErrors++
        if (importantErrors == 8) {
            console.error("closedReason", "tooManyImportantErrors")
            return ws.pause()
        }
        if (err[result] == "MOVEMENT_HAS_NO_UNITS") {
            console.error("closedReason", "MOVEMENT_HAS_NO_UNITS")
            return ws.pause()
        }
        if (err[result] == "CANT_START_NEW_ARMIES") {
            console.error("closedReason", "CANT_START_NEW_ARMIES")
            return ws.pause()
        }
    }

    if (timeout > 0) {
        timer = setTimeout(() => {
            xtHandler.removeListener(key, helperFunction)
            const msg = (result == undefined || result == 0) ? "TIMED_OUT" : !err[result] ? result : err[result]
            result = -1

            if(msg == "TIMED_OUT") {
                if(timedOut++ == 5) {
                    process.exit(0)
                }
            }
            
            console.warn(key, msg)

            reject(msg)
        }, timeout * (ggeConfig.timeoutMultiplier ?? 1) * 5)
    }

    const helperFunction = (data, _result) => {
        if (result != 0)
            result = _result

        const msg = (_result == undefined || _result == 0) ? "TIMED_OUT" : !err[_result] ? _result : err[_result]
        if(result != 0)
            checkForIssues()
        if (!func(Object(data), Number(_result)))
            return
        if(_result != 0)
            console.warn(key, msg)

        xtHandler.removeListener(key, helperFunction)
        clearInterval(timer)
        resolve([Object(data), Number(_result)])
    }

    xtHandler.addListener(key, helperFunction)
})

const ws = new WebSocket(`wss://${botConfig.gameURL}/`, {
    skipUTF8Validation: ggeConfig.skipUTF8Validation ? true : false
  })

const status = {}
const playerInfo = {
    level: NaN,
    userID: NaN,
    playerID: NaN,
    email: String(),
    acceptedTOS: Boolean(),
    verifiedEmail: Boolean(),
    isCheater: Boolean(),
    name: String(),
    alliance: {
        id: NaN,
        rank: Number(),
        name: String(),
        fame: Number(),
        searchingForPlayers: Boolean()
    }
}

module.exports = {
    events,
    botConfig,
    playerInfo,
    status,
    i18n
}

ws.onopen = () => ws.send('<msg t="sys"><body action="verChk" r="0"><ver v="166"/></body></msg>')
let errorCount = 0

ws.onmessage = ({data}) => {
    data = data.toString()
    if (data.charAt(0) == "%") {
        let [,,cmd,, r, obj] = data.split("%")
        const result = Number(r)
        try { obj = JSON.parse(obj) }
        catch(e) {
            console.debug(e)
        }

        switch (cmd) {
            case "gbd":
                for (const [key, value] of Object.entries(obj))
                    xtHandler.emit(key, value, 0)
                break
            case "vck":
                xtHandler.emit(cmd, obj, result)
                break
            case "gfl":
                xtHandler.emit(cmd, obj, result)
                break
            default:
                console.debug(err[result] ?? result, cmd)
            case "core_pol":
            case "rlu":
            case "lli":
                xtHandler.emit(cmd, obj, result)
        }
    }
    else if (data[0] == "<") {
        switch (data) {
            case "<msg t='sys'><body action='apiOK' r='0'></body></msg>":
                ws.send(`<msg t="sys"><body action="login" r="0"><login z="${botConfig.gameServer}"><nick><![CDATA[]]></nick><pword><![CDATA[undefined%en%0]]></pword></login></body></msg>`)
                break
            case "<msg t='sys'><body action='joinOK' r='1'><pid id='0'/><vars /><uLs r='1'></uLs></body></msg>":
                ws.send('<msg t="sys"><body action="roundTrip" r="1"></body></msg>')
                sendXT("vck", `undefined%web-html5%<RoundHouseKick>%${(Math.random() * Number.MAX_VALUE).toFixed()}`)
                break
            case "<msg t='sys'><body action='roundTripRes' r='1'></body></msg>":
                break
        }
    }
}

xtHandler.on("rlu", () => ws.send('<msg t="sys"><body action="autoJoin" r="-1"></body></msg>'))
xtHandler.on("gal", obj => {
    playerInfo.alliance.id = Number(obj.AID)
    playerInfo.alliance.rank = Number(obj.R)
    playerInfo.alliance.name = String(obj.N)
    playerInfo.alliance.fame = Number(obj.ACF)
    playerInfo.alliance.searchingForPlayers = Boolean(obj.SA)
})
xtHandler.on("gxp", obj => {
    playerInfo.level = obj.LVL + obj.LL

    if (!botConfig.externalEvent)
        return

    Object.assign(status, { level: playerInfo.level })
    parentPort.postMessage([ActionType.StatusUser, status])
})
xtHandler.on("gpi", obj => {
    playerInfo.userID = Number(obj.UID)
    playerInfo.playerID = Number(obj.PID)
    playerInfo.name = String(obj.PN)
    playerInfo.email = String(obj.E)
    playerInfo.verifiedEmail = Boolean(obj.V)
    playerInfo.acceptedTOS = Boolean(obj.CTAC)
    playerInfo.isCheater = Boolean(obj.CL)
})
xtHandler.on("gcu", ({C1, C2}) => {
    playerInfo.coin = C1
    playerInfo.rubies = C2
})
xtHandler.on("gai", obj => playerInfo.attackDailyCount = obj.AC)

async function retry() {
    if (botConfig.externalEvent) {
        sendXT("tlep", JSON.stringify({ TLT: botConfig.tempServerData.glt.TLT }))
    }
    if (botConfig.lt) {
        sendXT("lli", JSON.stringify({
            "CONM": 350,
            "RTM": 57,
            "ID": 0,
            "PL": 1,
            "NOM": botConfig.name,
            "LT": botConfig.lt,
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
}
xtHandler.on("vck", retry)

let loginAttempts = 0
xtHandler.on("lli", async (obj, r) => {
    if (r == 453) {
        console.log("retryLogin", obj.CD, "retryLoginSeconds")
        setTimeout(retry, obj.CD * 1000)
        return
    }

    if (err[r] == "IS_BANNED") {
        console.log("retryLogin", obj.CD, "retryLoginSeconds")
        console.log("retryLogin", (obj.RS / 60 / 60).toFixed(2), "retryLoginHours")
        setTimeout(retry, obj.RS * 1000)
        return
    }

    if (r == 0) {
        //Due to exploits that can break the client this is to give limited access again.
        const timer = setTimeout(() => {
            console.warn("loggedIn", "loggedInWithoutEventData")
            console.warn("featuresMightNotWork")
            events.emit("load")
        }, 30 * 1000 * (ggeConfig.timeoutMultiplier ?? 1))

        xtHandler.once("sei", () => {
            parentPort.postMessage([ActionType.Started])
            console.log("loggedIn")
            setTimeout(() => events.emit("load"), 4500)
            clearTimeout(timer)
        })
        events.emit("earlyLoad")
        setInterval(() => sendXT("pin", "<RoundHouseKick>"), 1000 * 60).unref()
        return
    }

    if (r == err["INVALID_LOGIN_TOKEN"]) {
        loginAttempts++
        if (loginAttempts < 30)
            return retry()
    }
    if (botConfig.internalWorker)
        process.exit(0)

    status.hasError = true
    parentPort.postMessage([ActionType.StatusUser, status])
    console.error(err[r])
    setTimeout(() => parentPort.postMessage([ActionType.KillBot]), 1000 * 8)
})

try {
    require("./plugins/misc.js")
}
catch(e) {
    console.debug(e)
}

for (const [, val] of Object.entries(botConfig.plugins)) {
    if (!val.state)
        continue
    try {
        require(`./${val.filename}`)
    }
    catch (e) {
        console.warn(e)
    }
}