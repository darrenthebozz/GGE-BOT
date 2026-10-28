import { writeFile, access, mkdir } from "node:fs/promises"
import { join } from "node:path"

const itemsPath = join('./', 'src', 'items')

await mkdir(itemsPath, { recursive: true })

const currentItemVersion = await fetch('https://empire-html5.goodgamestudios.com/default/items/ItemsVersion.properties').then(o => o.text())

const response = await fetch(`https://empire-html5.goodgamestudios.com/default/items/items_v${currentItemVersion.match(new RegExp(/(?!.*=).*/))[0]}.json`).then(a => a.json())

for (const [key, value] of Object.entries(response))
    if (/^[A-Za-z\_]+$/.test(key))
        await writeFile(join(itemsPath, `${key}.json`), JSON.stringify(value))