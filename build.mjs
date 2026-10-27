import * as esbuild from 'esbuild'
import { spawn } from 'node:child_process'
import { cp, readdir, rm, writeFile } from 'node:fs/promises'
import AdmZip from 'adm-zip'
import { join, normalize, basename } from 'node:path'

const files = await readdir("./src/frontend/dist", { recursive : true, withFileTypes: true })
const seaConfig = {
  "main": "./dist/server/helper.js",
  "mainFormat": "module",
  "output": "./dist/server/ggebot",
  "disableExperimentalSEAWarning": true,
  "useSnapshot": false,
  "useCodeCache": false,
  "useVfs": true,
  "execArgvExtension" : "none",
  "assets": {
    "dist/server/entry.js": "./dist/server/entry.js",
    "dist/server/bot.js": "./dist/server/bot.js",
    "node_modules.zip": "./dist/server/node_modules.zip",
    ...Object.fromEntries(files.filter(f => !f.isDirectory())
      .filter(f => f.name != "entry.mjs")
      .map(file => [normalize(join('dist',file.parentPath.replace('src\\frontend\\dist',''), file.name)), normalize(join(file.parentPath, file.name))]))
  }
}

async function runBuild() {
  await rm('./dist', { recursive: true, force: true })
  await esbuild.build({
    entryPoints: ['./src/bot.js', './src/helper.js', './src/entry.js'],
    bundle: true,
    platform: 'node',
    format: 'esm',
    outdir: 'dist/server/',
    sourcemap: false,
    minify: true,
    external: [
      'node:sea',
      '@embedded-postgres', //sharp
      './entry',
      './dist/server/entry.js'
    ],
    banner: {
      js: "import { createRequire } from 'module'; const require = createRequire(import.meta.url);",
    }, alias: {
      '@embedded-postgres/windows-x64': './src/embedded-postgres-bridge/windows-x64'
    },
    packages: 'bundle',
    target : "es2025",
    mangleProps: /^_/, 
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
}

runBuild().catch(e => {
  console.error(e)
  process.exitCode = 1
})