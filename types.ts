import type userDefaults from './modules/userDefaults.ts'
export type TLogLevel = 'INFO' | 'WARNING' | 'ERROR' | 'DEBUG'
export interface ILog {
    timestamp : string
    data : string[]
    loglevel : TLogLevel
}

type TOptions<T extends { [key : string] : any }> = NonNullable<T['options']>
export type IPluginOptionValueType<T extends { options?: Record<string, { type: keyof IPluginOptionType }> }> = {
    [Property in keyof TOptions<T>]:
    IPluginOptionType[NonNullable<TOptions<T>[Property]>['type']]
};

export interface IPluginOptionType {
    Number : number
    Toggle: boolean
}
export type IPluginOption = {
    [K in keyof IPluginOptionType]: {
        readonly type: K;
        readonly description?: string;
        readonly hideLabel?: boolean;
        readonly default?: IPluginOptionType[K];
    }
}[keyof IPluginOptionType];
export interface IPlugin {
    readonly key : string
    readonly filePath : string
    readonly description: string
    readonly options: { readonly [key : string]: IPluginOption }
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
export type IUser = typeof userDefaults & {
    id: number
    owneruuid: string
    name: string
    logintoken: string
    plugins: {
        [key : string] : ({
            [key : string] : IPluginOptionType[keyof IPluginOptionType]
        } & { state : boolean })
    }
    state: boolean
    servertype: 'default' | 'horizon' | 'outerRealm'
    serverid: number
}
export interface IUserEvents { 
    sub_user_update : string
    sub_user_delete : string 
    history_update : string
}