import * as esbuild from 'esbuild';
import { cp, rm } from 'node:fs/promises';

async function runBuild() {
  await rm('./dist', { recursive: true, force: true });
  await esbuild.build({
    entryPoints: ['./src/entry.mts', './src/bot.js'],     // Your app's entry file
    bundle: true,                      // Bundle all dependencies together
    platform: 'node',                  // Target the Node.js runtime environment
    format: 'esm',                     // Output standard ES modules ('cjs' for CommonJS)
    outdir: 'dist/server/',          // The final output file path
    sourcemap: true,                   // Generate sourcemaps for debugging
    minify: true,//process.env.NODE_ENV === 'production', // Minify code only for production
    external: [
      '@embedded-postgres'
    ],
    banner: {
        js: "import { createRequire } from 'module'; const require = createRequire(import.meta.url);",
      },
    packages: 'bundle'
  });

  await cp('./src/frontend/dist/client', './dist/client', { recursive: true });

  console.log('Build complete!');
}

runBuild().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});