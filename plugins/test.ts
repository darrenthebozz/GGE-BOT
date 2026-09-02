import { events, close } from '../bot'

events.on('load', () => {
    console.log("Well it works ig")
    close()
})
events.on('unload', () => {
    console.log("Shutting down ig")
})
events.on('restartPlugin', (key) => {
    console.log("We are back")
})
events.on('unloadPlugin', (key) => {
    console.log("We are gone")
})