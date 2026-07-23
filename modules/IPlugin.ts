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