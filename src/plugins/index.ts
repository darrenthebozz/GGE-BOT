/// <reference types="vite/client" />

import type { IPlugin } from '@bot/types'
export type IPluginK = IPlugin & { key : string }

let plugins = [] as IPluginK[]

if(globalThis.window != undefined) {
    plugins = Object.entries(import.meta.glob('./**/*.*', { eager: true, import : "pluginInfo" })).map(([key, pluginInfo]) => 
        ({ ...pluginInfo as IPlugin, key}))
}
else {
    const { join, relative, resolve } = await import(/* @vite-ignore */'path')
    const { glob  } = await import(/* @vite-ignore */'fs/promises')
    const filePaths = (await Array.fromAsync(glob(join(import.meta.dirname, '**/*.*'))))
        .filter(filePath => resolve(import.meta.filename) != resolve(filePath))

    plugins = await Promise.allSettled<IPluginK>(
        filePaths.map(filePath => import(/* @vite-ignore */`file://${filePath}`).then(o => ({ key : relative(import.meta.dirname, filePath), ...o.pluginInfo}))))
            .then(o => o.filter(o => o.status == 'fulfilled')
            .map(o => o.value ))
}

export default plugins
