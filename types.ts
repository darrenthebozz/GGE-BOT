export interface ILog {
    sequence : number
    timestamp : string
    data : string[]
    loglevel : 'INFO' | 'WARNING' | 'ERROR' | 'DEBUG'
    owneruuid : string
}

export interface IPluginOptionType {
    Number : number
    Toggle: boolean
}
export interface IPluginOption {
    type: keyof IPluginOptionType
    description?: string
    value?: any
    hideLabel?: boolean
}
export interface IPlugin {
    key : string
    filePath : string
    description: string
    options: {[key : string]: IPluginOption | undefined}
}
export interface IBotConfig {
    id: number
    owneruuid: string
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
    plugins: {
        [key : string] : {
            state : boolean
            [key : string] : any
        } | undefined
    }
    state: boolean
    servertype: 'default' | 'horizon' | 'outerRealm' | 'outerRealm&horizon'
    serverid: number
}
export interface IUserEvents { 
    sub_user_update : string
    sub_user_delete : string 
    history_update : string
}