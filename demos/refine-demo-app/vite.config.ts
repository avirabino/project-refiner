import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 39000,
    strictPort: false // auto-increments to 39001, 39002 if port is taken
  }
});
