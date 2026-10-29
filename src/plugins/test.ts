import type { IPlugin } from "@bot/types"
const __ = (o : any) => o

export const pluginInfo = {
    name : __("Test"),
    description: "description",
    options: {
        numberr: { type: "Number", default: 2 },
        string: { type: "Toggle" }
    }
} satisfies Omit<IPlugin, 'key'>

export default async () => {
    const { events, getPluginOptions } = await import("@bot")
    const options = getPluginOptions<typeof pluginInfo>()
    const units = await import('@items/units.json').then(o => o.default) 

    events.on('load', async () => {
        console.log(JSON.stringify(options))
        console.log(JSON.stringify(units[0]))
        console.log("Loaded")
    })
}