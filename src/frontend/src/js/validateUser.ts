import type { IUser } from '@bot/types.ts'
import login from './ggebot'

type TLog = { type: "TIMEOUT", value: number }

export default (user: IUser, password: string, callback: (log: TLog) => void) => new Promise(async (resolve, reject) => {
    const instances = await import('./serverInstances').then(i => i.default)!
    const { zone, server: gameURL } = instances.find(({ value }) => Number(user.serverid) == value)!

    return resolve(user.logintoken = "fake val")
    const loginEvents = login(user.name, password, zone, gameURL)
    loginEvents.addEventListener("TIMEOUT", ({ detail: timeout }: any) => callback({
        type: "TIMEOUT",
        value: timeout
    }))
    loginEvents.addEventListener("ERROR", ({ detail: { r } }: any) => {
        r == 21 ? reject({ type: "ERROR", value: 'User not found' }) : reject({ type: "ERROR", value: `Unknown Error ${r}` })
    })
    loginEvents.addEventListener("LOGGEDIN", ({ detail }: any) => resolve(user.logintoken = detail))
})