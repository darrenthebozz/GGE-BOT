process.on("uncaughtException", console.error)

import { workerData } from "node:worker_threads"
import { getCallSites } from "node:util"
import path from "node:path"
import client from './modules/database.ts'
import type IUser from './modules/IUser.ts'

const id = workerData.id 
const ownerUUID = workerData.ownerUUID

function mngLog(logLevel : "INFO" | "WARNING" | "ERROR" | "DEBUG", ...msg : Array<any>) {
    const fileName = path.basename(getCallSites(6)[2]?.scriptName).slice(0, -3)
    const message = ['[',fileName,'] ', ...(msg.map(m => m instanceof Error ? m.message : String(m)))]

    client.query(`INSERT INTO history_${id} (sequence, timestamp, data, logLevel, owneruuid) VALUES (nextval('history_sequence'), default, $1, $2, $3) 
                 ON CONFLICT (sequence) DO UPDATE SET timestamp = now(), data = $1, logLevel = $2;`, [message, logLevel, ownerUUID])
}

console.log = console.info = (...msg) => mngLog("INFO", msg)
console.warn = (...msg) => mngLog("WARNING", msg)
console.error = (...msg) => mngLog("ERROR", msg)
console.debug = (...msg) => mngLog("DEBUG", msg)

setInterval(() => {
    console.log("hello world")
}, 1000)