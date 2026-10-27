import { events, getPluginOptions } from '@bot'
import type { Test } from "@plugins/index"

const options = getPluginOptions<typeof Test>()

events.on('load', () => 
    console.log("LOAD"))