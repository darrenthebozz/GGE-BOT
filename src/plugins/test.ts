import { events, getPluginOptions } from '@bot'
import type { IPlugin } from '@bot/types'
import units from '@items/units.json'
console.log(JSON.stringify(units[0]))

export const Test = {
    key : "test",
    filePath : "./test.ts",
    description: "description",
    options: {
        numberr: { type: "Number", default : 2 },
        string: { type: "Toggle" }
    }
} satisfies IPlugin

const options = getPluginOptions<typeof Test>()

events.on('load', () => {
    console.log("Loaded")
})