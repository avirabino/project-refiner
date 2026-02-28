import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { crx } from '@crxjs/vite-plugin'
import { resolve } from 'path'
import manifest from './manifest.json'

export default defineConfig({
  plugins: [
    react(),
    crx({ manifest }),
  ],

  resolve: {
    alias: {
      '@synaptix/vigil-shared': resolve(__dirname, 'packages/shared/src'),
      '@shared': resolve(__dirname, 'src/shared'),
      '@core': resolve(__dirname, 'src/core'),
      '@background': resolve(__dirname, 'src/background'),
      '@content': resolve(__dirname, 'src/content'),
      '@popup': resolve(__dirname, 'src/popup'),
      '@changelog': resolve(__dirname, 'CHANGELOG.md'),
    },
  },

  build: {
    outDir: 'dist',
    emptyOutDir: true,
    sourcemap: process.env.NODE_ENV === 'development',
    rollupOptions: {
      input: {
        'popup': resolve(__dirname, 'src/popup/popup.html'),
        'new-session': resolve(__dirname, 'src/new-session/new-session.html'),
        'sidepanel': resolve(__dirname, 'src/sidepanel/sidepanel.html'),
        'replay-viewer': resolve(__dirname, 'src/replay-viewer/replay-viewer.html'),
      },
      output: {
        // Keep chunk names readable for extension debugging
        chunkFileNames: 'assets/[name]-[hash].js',
      },
    },
  },

  // CRXJS handles HMR for extension development
  server: {
    port: 5173,
    strictPort: true,
    hmr: {
      port: 5173,
    },
  },
})
