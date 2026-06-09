import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'node:path'

// NOTE: No COOP/COEP headers — UpscalerJS WebGPU/WebGL path does not need
// SharedArrayBuffer. Confirmed via free.upscaler.video recon.
// See findings-websr-recon.md and PRD section 4.6.

export default defineConfig({
  plugins: [react()],
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
