import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
  plugins: [
    {
      name: 'raw-transform',
      transform(_code: string, id: string) {
        if (id.includes('?raw')) {
          return { code: `export default ''` };
        }
      },
    },
  ],
  test: {
    environment: 'jsdom',
    reporters: 'dot',
    include: ['tests/unit/**/*.test.ts', 'tests/integration/**/*.test.ts', 'packages/server/src/modules/**/tests/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['src/shared/**'],
      all: true
    }
  },
  resolve: {
    alias: {
      '@synaptix/vigil-shared': resolve(__dirname, './packages/shared/src'),
      '@shared': resolve(__dirname, './src/shared'),
      '@core': resolve(__dirname, './src/core'),
      '@background': resolve(__dirname, './src/background'),
      '@content': resolve(__dirname, './src/content'),
      '@popup': resolve(__dirname, './src/popup'),
      '@reporter': resolve(__dirname, './src/reporter')
    }
  }
});
