export interface ILog {
    sequence : number,
    timestamp : string,
    data : string[],
    loglevel : 'INFO' | 'WARNING' | 'ERROR' | 'DEBUG',
    owneruuid : string
}
export enum PluginOptionType {
    Toggle,
    Number
}
export interface PluginOption {
    id: string
    type: PluginOptionType
    description?: string
    value?: any
    hideLabel?: boolean
    [key: string]: any
}
export interface Plugin {
    name: string
    description: string
    options: PluginOption[]
    state : boolean
}
export interface IBotConfig { id: number, owneruuid: string, port: string, workingPath: string }
export interface IInstance {
      value: number
      name: string
      serverInstance: string
      zone: string
      server: string
}
export interface IUser {
    id: number
    ownerUUID: string
    name: string
    loginToken: string
    plugins: { [key: string]: PluginOptionType }
    state: boolean
    serverType: 'default' | 'horizon' | 'outerRealm' | 'outerRealm&horizon'
    serverID: number
    [key: string]: any
}
