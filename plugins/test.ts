import { events, close, getPluginOptions } from '../bot.ts'

const options = getPluginOptions()! 

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

