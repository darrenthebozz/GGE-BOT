export interface ILog {
    sequence : number
    timestamp : string
    data : string[]
    loglevel : 'INFO' | 'WARNING' | 'ERROR' | 'DEBUG'
    owneruuid : string
}
export enum PluginOptionType {
    Toggle,
    Number
}
export interface IPluginOption {
    id: string
    type: PluginOptionType
    description?: string
    value?: any
    hideLabel?: boolean
}
export interface IPlugin {
    name: string
    description: string
    options: IPluginOption[]
    state : boolean
}
export interface IBotConfig {
    id: number
    owneruuid: string
    url: string
    workingPath: string
}
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
    plugins: IPlugin[]
    state: boolean
    servertype: 'default' | 'horizon' | 'outerRealm' | 'outerRealm&horizon'
    serverid: number
}
export interface IUserEvents { 
    sub_user_update : string
    sub_user_delete : string 
    history_update : string
}