import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import path from 'node:path'

// NOTE: No COOP/COEP headers — UpscalerJS WebGPU/WebGL path does not need
// SharedArrayBuffer. Confirmed via free.upscaler.video recon.
// See findings-websr-recon.md and PRD section 4.6.

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      // We're not shipping an installable PWA yet (per PRD non-goals), but
      // the service worker buys us: instant repeat visits, full offline use
      // once the model is cached, and a clean update prompt.
      registerType: 'prompt',
      // Inject the SW into index.html via the helper module.
      injectRegister: false,
      includeAssets: ['favicon.svg'],
      manifest: false,
      workbox: {
        // Precache all built assets, including the lazy chunks.
        globPatterns: ['**/*.{js,css,html,svg,woff,woff2}'],
        // TF.js + upscaler chunks together are ~1.2MB minified. Default
        // precache cap is 2MB; bump to 4MB so the model code is part of
        // the precache (so it lands instantly on visit #2 + offline).
        maximumFileSizeToCacheInBytes: 4 * 1024 * 1024,
        navigateFallback: '/index.html',
        runtimeCaching: [
          {
            urlPattern: ({ request }) => request.destination === 'font',
            handler: 'CacheFirst',
            options: {
              cacheName: 'fonts',
              expiration: { maxAgeSeconds: 60 * 60 * 24 * 365 },
            },
          },
          {
            urlPattern: ({ request }) => request.destination === 'image',
            handler: 'StaleWhileRevalidate',
            options: { cacheName: 'images' },
          },
        ],
      },
      devOptions: {
        // Keep SW out of the way during development — too easy to ship a
        // stale build to yourself otherwise.
        enabled: false,
      },
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  // Let Vite pre-bundle everything via esbuild. Earlier guidance to exclude
  // upscaler/tfjs is stale — without pre-bundling, `long` (transitive UMD
  // dep of TF.js) crashes the browser with "module is not defined".
  // We explicitly include the chunk roots so esbuild walks them once and
  // hands the browser proper ES modules.
  optimizeDeps: {
    include: [
      'upscaler',
      '@upscalerjs/esrgan-slim/2x',
      '@upscalerjs/esrgan-slim/4x',
      '@tensorflow/tfjs',
      'long',
    ],
  },
  worker: {
    format: 'es',
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('upscaler') || id.includes('@upscalerjs')) return 'upscaler'
            if (id.includes('@tensorflow')) return 'tfjs'
            if (id.includes('heic2any')) return 'heic'
            if (
              id.includes('react-dom') ||
              id.includes('react-router') ||
              id.includes('/react/')
            )
              return 'react'
          }
          return undefined
        },
      },
    },
  },
})
