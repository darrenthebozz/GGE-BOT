import { PluginOptionType } from "./IPlugin"

export default interface User {
    id: number,
    ownerUUID: string,
    name: string,
    loginToken: string,
    plugins: { [key: string]: PluginOptionType }
    state: boolean,
    servertype: 'default' | 'horizon' | 'outerRealm' | 'outerRealm&horizon'
    serverID: number
    [key: string]: any
}
