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
export interface IBotConfig { id: number, owneruuid: string, url: string, workingPath: string }
export interface IInstance {
      value: number
      name: string
      serverInstance: string
      zone: string
      server: string
}
export interface IUser {
    id: number
    owneruuid: string
    name: string
    logintoken: string
    plugins: { [key: string]: PluginOptionType }
    state: boolean
    servertype: 'default' | 'horizon' | 'outerRealm' | 'outerRealm&horizon'
    serverid: number
    // [key: string]: any
}
