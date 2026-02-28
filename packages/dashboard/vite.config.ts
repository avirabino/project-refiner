import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig({
  plugins: [react()],
  base: '/dashboard/',
  resolve: {
    alias: {
      '@synaptix/vigil-shared': resolve(__dirname, '../shared/src'),
    },
  },
  build: {
    outDir: '../server/public',
    emptyOutDir: true,
  },
  server: {
    proxy: {
      '/api': 'http://localhost:7474',
      '/health': 'http://localhost:7474',
    },
  },
});
