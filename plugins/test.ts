import { events, close, getPluginOptions } from '../bot.ts'
import type { IPlugin } from "../types.ts"
export const Test = {
    key : "test",
    description: "",
    options: {
        numberr: {
            type: "Number"
        },
        string: {
            type: "Toggle"
        }
    }
} satisfies IPlugin

const options = getPluginOptions<typeof Test>()
options.numberr

events.on('load', () => {
    console.log("Well it works ig")
    close()
})
events.on('unload', () => {
    console.log("Shutting down ig")
})
events.on('reloadPlugin', (key) => {
    console.log("We are back")
})
events.on('unloadPlugin', (key) => {
    console.log("We are gone")
})

