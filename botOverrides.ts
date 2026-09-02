import { getCallSites } from "node:util"
import { basename } from "node:path"
import { workerData } from "node:worker_threads"
import client from './modules/database.ts'
import type { IBotConfig } from './types.ts'

const { id, owneruuid } = workerData as IBotConfig

function mngLog(logLevel: "INFO" | "WARNING" | "ERROR" | "DEBUG", ...msg: Array<any>) {
    const fileName = basename(getCallSites(6)[2]?.scriptName).slice(0, -3)
    const message = ['[', fileName, '] ', ...(msg.map(m => m instanceof Error ? m.message : String(m)))]

    client.query(`INSERT INTO history_${id} (sequence, timestamp, data, logLevel, owneruuid) VALUES (nextval('history_sequence_${id}'), default, $1, $2, $3) 
                 ON CONFLICT (sequence) DO UPDATE SET timestamp = now(), data = $1, logLevel = $2;`, [message, logLevel, owneruuid])
}

console.log = console.info = (...msg) => mngLog("INFO", msg)
console.warn = (...msg) => mngLog("WARNING", msg)
console.error = (...msg) => mngLog("ERROR", msg)
console.debug = (...msg) => mngLog("DEBUG", msg)

const _setTimeout = setTimeout as any
const setTimeoutOverride = (handler: TimerHandler, timeout?: number | undefined, ...args: any[]) =>
    _setTimeout(handler, timeout, ...args).unref()
setTimeoutOverride.__promisify__ = _setTimeout.__promisify__

//@ts-ignore
setTimeout = setTimeoutOverride

const _setInterval = setInterval as any
//@ts-ignore
setInterval = (handler: TimerHandler, timeout?: number | undefined, ...args: any[]) =>
    _setInterval(handler, timeout, ...args).unref()
