// @ts-check
import { defineConfig, memoryCache } from 'astro/config'
import tailwindcss from '@tailwindcss/vite'

import node from '@astrojs/node'
import vue from '@astrojs/vue'

// https://astro.build/config
export default defineConfig({
  output: 'server',
  vite: {
    plugins: [
      tailwindcss()
    ]
  },
  integrations: [vue(), (await import("astro-compress")).default()],
  adapter: node({
    mode: 'standalone'
  }),
  experimental: {
    cache: {
      provider: memoryCache()
    }
  },
  prefetch: true
})