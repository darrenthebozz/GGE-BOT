import { symlink, readlink, writeFile, access } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"

const itemsPath = join(tmpdir(), 'ggeBot', 'items')
if (!access(itemsPath).catch(o => undefined)) {
    const currentItemVersion = await fetch('https://empire-html5.goodgamestudios.com/default/items/ItemsVersion.properties').then(o => o.text())

    const response = await fetch(`https://empire-html5.goodgamestudios.com/default/items/items_v${currentItemVersion.match(new RegExp(/(?!.*=).*/))[0]}.json`).then(a => a.json())

    for (const [key, value] of Object.entries(response))
        if (/^[A-Za-z\_]+$/.test(key))
            await writeFile(join(itemsPath, `${key}.json`), JSON.stringify(value))
}
const symlinkPath = join('.', 'src', 'items')

if (await readlink(symlinkPath).catch(o => undefined))
    process.exit(0)

if (await symlink(itemsPath, symlinkPath).catch(o => {
    console.log("Symlink failed may need privileges...")
    console.log(o.message)
    return undefined
}))
    process.exit(0)

process.exit(1)