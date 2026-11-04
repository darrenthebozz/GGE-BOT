import * as esbuild from 'esbuild'
import { spawn } from 'node:child_process'
import { cp, readdir, rm, writeFile, glob, access, mkdir, readFile } from 'node:fs/promises'
import AdmZip from 'adm-zip'
import path, { join, relative, basename, normalize, extname } from 'node:path'

import babel from 'esbuild-plugin-babel'

const logFilenamePlugin = {
  name: 'log-filename-plugin',
  setup(build) {
    // Only target local JavaScript and TypeScript files
    build.onLoad({ filter: /\.[jt]sx?$/ }, async (args) => {
      const source = await readFile(args.path, 'utf8')
      const filename = path.parse(args.path).name
      // console.debug(path.parse(relative('.', args.path)).dir)
      if (path.parse(relative('.', args.path)).dir.includes('node_module') ||
        filename.includes('botOverrides'))
        return //console.debug("skipped")

      const modifiedSource = source.replace(
        /console\.(log|info|warn|error)/g,
        `!((...a) => console.$1('[','${filename}',']',...a))`
      );

      // Determine loader type based on file extension
      const ext = extname(args.path).replace('.', '');
      const loader = ext === 'jsx' || ext === 'tsx' ? ext : ext.startsWith('ts') ? 'ts' : 'js';

      // 4. Hand the modified source back to esbuild
      return {
        contents: modifiedSource,
        loader: loader,
      };
    });
  },
};

function prependConsoleFilename({ types: t }) {
  return {
    visitor: {
      CallExpression(path, state) {
        const callee = path.get('callee');

        // Matches `console.log`, `console.warn`, etc.
        if (callee.matchesPattern('console', true)) {
          // Get the name of the file currently being processed
          const absolutePath = basename(state.file.opts.filename) || 'bot';
          const fileName = absolutePath.split('/').pop();

          // Safely unshift a new string literal argument onto the call
          path.node.arguments.unshift(t.stringLiteral(`[${fileName}]`));
        }
      }
    }
  };
}

const itemsPath = join('src', 'generated', 'items')

await rm('./dist/server', { recursive: true, force: true })
await rm('./dist/client', { recursive: true, force: true })
await mkdir(join('.', 'dist', "items"), { recursive: true })
await mkdir(join('.', 'src', "generated", 'items'), { recursive: true })

let itemsVersion = await readFile(join(itemsPath, 'versionInfo.json'))
  .then(o => JSON.parse(o.toString())?.version["@value"]).catch(({ }) => "")

const currentItemVersion = await fetch('https://empire-html5.goodgamestudios.com/default/items/ItemsVersion.properties').then(o => o.text())
if (itemsVersion != currentItemVersion) {
  const response = await fetch(`https://empire-html5.goodgamestudios.com/default/items/items_v${currentItemVersion.match(new RegExp(/(?!.*=).*/))[0]}.json`).then(a => a.json())

  for (const [key, value] of Object.entries(response))
    if (/^[A-Za-z\_]+$/.test(key))
      await writeFile(join(itemsPath, `${key}.json`), JSON.stringify(value))
}

const filePaths = (await Array.fromAsync(glob('./src/plugins/**/*.*'))).map(e => relative('./src/plugins/', e)).filter(e => e != 'index.ts').map(filePath => {
  return path.parse(filePath).dir + path.parse(filePath).name
})

// await writeFile('./src/generated/staticPluginsImports.ts', `export default await Promise.all([${filePaths.map(e => 
//   `import(${JSON.stringify("@plugins/" + e)})`)}]).then(o => o.map(s => {key: ${path.parse(e).dir}, init:e.default, ...s.pluginInfo}))`)

//import("@plugins/test copy 2").then(e => ({key: "", init: e.default, ...e.pluginInfo})),

await writeFile('./src/generated/staticPluginsImports.ts',
  `export default await Promise.all([${filePaths.map(file => {
    const parsedPath = path.parse(file)
    return `\n  import(${JSON.stringify('@plugins/' + file)}).then(e => ({key: ${JSON.stringify('./' + parsedPath.dir + parsedPath.name)}, init: e.default, ...e.pluginInfo}))`
  })}\n])`)

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
    './dist/server/entry.js'
  ],
  banner: {
    js: "var require = (await import('module')).createRequire(import.meta.url);",
  }, alias: {
    ...Object.fromEntries(items),
    '@embedded-postgres/windows-x64': './src/generated/embedded-postgres-bridge/windows-x64'
  },
  // loader: { 
  //   '.ts': 'js',
  //   '.tsx': 'jsx'
  // },
  packages: 'bundle',
  target: "es2025",
  plugins : [logFilenamePlugin]
  // plugins: [babel({
  //   filter: /\.(js|jsx|ts|tsx)$/,
  //   config: {
  //   presets: ['@babel/preset-typescript', { 
  //         "onlyRemoveTypeImports": true 
  //       }],
  //     plugins: [prependConsoleFilename]
  //   }
  // })]
})

/*["minify-replace", {
    "replacements": [{
      "identifierName": "__DEV__",
      "replacement": {
        "type": "booleanLiteral",
        "value": true
      }
    }]
  }
  ] */
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