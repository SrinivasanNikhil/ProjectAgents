import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/setupTests.ts'],
    globals: true,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
      '@/components': path.resolve(__dirname, 'src/client/components'),
      '@/hooks': path.resolve(__dirname, 'src/client/hooks'),
      '@/utils': path.resolve(__dirname, 'src/client/utils'),
      '@/services': path.resolve(__dirname, 'src/server/services'),
      '@/models': path.resolve(__dirname, 'src/server/models'),
      '@/routes': path.resolve(__dirname, 'src/server/routes'),
      '@/middleware': path.resolve(__dirname, 'src/server/middleware'),
      '@/config': path.resolve(__dirname, 'src/server/config'),
    },
  },
});
