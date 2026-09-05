import { events, close, getPluginOptions } from '../bot.ts'
import type { Test } from "./index.ts"

const options = getPluginOptions<typeof Test>()

console.log(JSON.stringify(options))

events.on('load', () => 
    console.log("LOAD"))
events.on('unload', () => 
    console.log("UNLOAD"))
events.on('reloadPlugin', key => 
    console.log("RELOADPLUGIN", key))
events.on('unloadPlugin', key => {
    console.log("UNLOADPLUGIN", key)
    close("CLOSE")
})

