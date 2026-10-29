// @ts-check
import { defineConfig, memoryCache } from 'astro/config'
import tailwindcss from '@tailwindcss/vite'

import node from '@astrojs/node'
import vue from '@astrojs/vue'

// https://astro.build/config
export default defineConfig({
  security: {
    checkOrigin: false
  },
  output: 'server',
  vite: {
    plugins: [
      tailwindcss()
    ],
    build: {
      cssCodeSplit: false,
      cssMinify: true,
    },
    ssr: {
      // noExternal: true,
      // external:  ['cssesc', 'sharp']
    }
  },
  integrations: [vue()],
  adapter: node({
    mode: 'standalone'
  }),
  cache: {
    provider: memoryCache(),
  },
  prefetch: true
})