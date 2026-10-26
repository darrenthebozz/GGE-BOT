import * as esbuild from 'esbuild';
import { spawn } from 'node:child_process';
import { cp, rm } from 'node:fs/promises';
import AdmZip from 'adm-zip';
import seaConfig from './sea-config.json' with { type: 'json'};
import path from 'path';

async function runBuild() {
  await rm('./dist', { recursive: true, force: true });
  await esbuild.build({
    entryPoints: ['./src/bot.js', './src/helper.js', './src/entry.js'],     // Your app's entry file
    bundle: true,                      // Bundle all dependencies together
    platform: 'node',                  // Target the Node.js runtime environment
    format: 'esm',                     // Output standard ES modules ('cjs' for CommonJS)
    outdir: 'dist/server/',          // The final output file path
    sourcemap: false,                   // Generate sourcemaps for debugging
    minify: true,//process.env.NODE_ENV === 'production', // Minify code only for production
    external: [
      'node:sea',
      '@embedded-postgres', //sharp
      './entry',
      './dist/server/entry.js'
    ],
    banner: {
      js: "import { createRequire } from 'module'; const require = createRequire(import.meta.url);",
    }, alias: {
      // Redirects the hardcoded dependency lookups to a dynamic local bridge file
      '@embedded-postgres/windows-x64': './src/embedded-postgres-bridge/windows-x64'
    },
    packages: 'bundle'
  });

  const zip = new AdmZip();
  await zip.addLocalFolderPromise(path.join(import.meta.dirname, "./node_modules/@embedded-postgres"), { zipPath: "@embedded-postgres" });
  zip.writeZip(path.join(import.meta.dirname, '/dist/server', 'node_modules.zip'));
  const child = spawn('node', ['--build-sea', 'sea-config.json'], {
    stdio: 'inherit',
    shell: false // Add this if running on Windows to safely find the node executable
  });
  const code = await new Promise(r => child.on('close', r));
  if (code != 0)
    throw new Error("Unexpected return code from NODE SEA.")

  if (process.platform === 'win32') {
    await cp(seaConfig.output, `./${path.basename(seaConfig.output)}.exe`)
  }

  console.log('Build complete!');
}

runBuild().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});