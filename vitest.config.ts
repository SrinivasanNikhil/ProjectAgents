import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/setupTests.ts'],
    globals: true,
  },
  resolve: {
    alias: {
      '@': '/src',
      '@/components': '/src/client/components',
      '@/hooks': '/src/client/hooks',
      '@/utils': '/src/client/utils',
      '@/services': '/src/server/services',
      '@/models': '/src/server/models',
      '@/routes': '/src/server/routes',
      '@/middleware': '/src/server/middleware',
      '@/config': '/src/server/config',
    },
  },
});
