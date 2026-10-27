import type { IUser } from '@bot/types.ts'
import login from './ggebot'
import err from '@bot/err.json'

export type TLog = { type: "TIMEOUT" | "ERROR", value: number | string }

export default (user: IUser, password: string, callback: (log: TLog) => void) => new Promise(async (resolve, reject) => {
    const instances = await import('./serverInstances').then(i => i.default)!
    const { zone, server: gameURL } = instances.find(({ value }) => Number(user.serverid) == value)!
    const loginEvents = login(user.name, password, zone, gameURL)

    loginEvents.addEventListener("TIMEOUT", ({ detail: timeout }: any) => callback({
        type: "TIMEOUT",
        value: timeout
    }))
    loginEvents.addEventListener("ERROR", ({ detail: { r } }: any) => {
        const log = { type: "ERROR", value: `Unknown Error ${err[r] ?? r}` } as TLog
        switch(err[r]) {
            case "INVALID_PASSWORD":
                log.value = "Invalid password."
                break
            case "PLAYER_NOT_FOUND":
                log.value = "User not found."
                break
        }
        reject(log)
    })
    loginEvents.addEventListener("LOGGEDIN", ({ detail }: any) => resolve(user.logintoken = detail))
})