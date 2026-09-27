import type { IUser } from '../../../types.ts'
import login from '../js/ggebot.ts'

type TLog = { type: "TIMEOUT", value: number }

const instances = import('./serverInstances.ts').then(i => i.default)!
export default (user: IUser, password: string, callback: (log: TLog) => void) => new Promise(async (resolve, reject) => {
    const { zone, server: gameURL } = (await instances).find(({ value }) => Number(user.serverid) == value)!

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