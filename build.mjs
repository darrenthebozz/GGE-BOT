import * as esbuild from 'esbuild'
import { spawn } from 'node:child_process'
import { cp, readdir, rm, writeFile, access, mkdir } from 'node:fs/promises'
import AdmZip from 'adm-zip'
import path, { join, normalize, basename } from 'node:path'
import { tmpdir } from 'node:os'

const workingPath = join(tmpdir(), 'ggeBot')
const itemsPath = join(workingPath, 'items')

await rm('./dist', { recursive: true, force: true })
await mkdir(join('.', 'dist', "items"), { recursive: true })

if (!access(itemsPath).catch(o => undefined)) {
  const currentItemVersion = await fetch('https://empire-html5.goodgamestudios.com/default/items/ItemsVersion.properties').then(o => o.text())

  const response = await fetch(`https://empire-html5.goodgamestudios.com/default/items/items_v${currentItemVersion.match(new RegExp(/(?!.*=).*/))[0]}.json`).then(a => a.json())

  for (const [key, value] of Object.entries(response))
    if (/^[A-Za-z\_]+$/.test(key))
      await writeFile(join(itemsPath, `${key}.json`), JSON.stringify(value))
}

const seaExtraAssets = (await readdir("./src/frontend/dist", { recursive: true, withFileTypes: true })).filter(f => !f.isDirectory())
  .filter(f => f.name != "entry.mjs")
  .map(file => [normalize(join('dist', file.parentPath.replace('src\\frontend\\dist', ''), file.name)), normalize(join(file.parentPath, file.name))])

const seaConfig = {
  "main": "./dist/server/helper.js",
  "mainFormat": "module",
  "output": "./dist/server/ggebot",
  "disableExperimentalSEAWarning": true,
  "useSnapshot": false,
  "useCodeCache": false,
  "useVfs": true,
  "execArgvExtension": "none",
  "assets": {
    "dist/server/entry.js": "./dist/server/entry.js",
    "dist/server/bot.js": "./dist/server/bot.js",
    "node_modules.zip": "./dist/server/node_modules.zip",
    ...Object.fromEntries(seaExtraAssets)
  }
}
const items = (await readdir(itemsPath, { recursive: true, withFileTypes: true })).filter(f => !f.isDirectory())
  .map(file => {
    const parseFile = path.parse(join('.', 'dist', 'items', `${file.name}.js`))

    return [`@items/${parseFile.name}`, `./${join(parseFile.dir, parseFile.base)}`]
  })

console.log(items)
await Promise.all(items.map(([_, filename]) => {
  return writeFile(filename, `
    import { readFile } from 'node:fs/promises'
    import { tmpdir } from 'node:os'
    import { join } from 'node:path'
    export default await readFile(join(tmpdir(), 'ggeBot', 'items', '${path.parse(filename).base.slice(0, -3)}'), { encoding : 'utf-8'}).then(JSON.parse)
  `)
}))

await esbuild.build({
  entryPoints: ['./src/bot.js', './src/helper.js', './src/entry.js'],
  bundle: true,
  platform: 'node',
  format: 'esm',
  outdir: 'dist/server/',
  sourcemap: false,
  minify: false,
  external: [
    'node:sea',
    '@embedded-postgres', //sharp
    './entry',
    './dist/server/entry.js'
  ],
  banner: {
    js: "var require = (await import('module')).createRequire(import.meta.url);",
  }, alias: {
    ...Object.fromEntries(items),
    '@embedded-postgres/windows-x64': './src/embedded-postgres-bridge/windows-x64'
  },
  packages: 'bundle',
  target: "es2025"
})

const zip = new AdmZip()
await zip.addLocalFolderPromise(join(import.meta.dirname, "./node_modules/@embedded-postgres"), { zipPath: "@embedded-postgres" })
zip.writeZip(join(import.meta.dirname, '/dist/server', 'node_modules.zip'))

await writeFile("./sea-config.json", JSON.stringify(seaConfig))

const child = spawn('node', ['--build-sea', 'sea-config.json'], {
  stdio: 'inherit',
  shell: false
})
const code = await new Promise(r => child.on('close', r))
if (code != 0)
  throw new Error("Unexpected return code from NODE SEA.")

if (process.platform === 'win32')
  await cp(seaConfig.output, `./${basename(seaConfig.output)}.exe`)

console.log('Build complete!')