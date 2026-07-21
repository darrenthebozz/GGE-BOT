enum PluginOptionType {
    Toggle,
    Number
}

interface PluginOption {
    id: string
    type: PluginOptionType
    description?: string
    value?: any
    hideLabel?: boolean
}

interface Plugin {
    name: string
    description: string
    options: PluginOption[]
    state : boolean
}