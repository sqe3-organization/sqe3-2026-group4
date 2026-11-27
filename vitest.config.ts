import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, './src'),
      '@tests': path.resolve(import.meta.dirname, './tests'),
    },
  },
  test: {
    globals: true,
    coverage: {
      include: ['src/**/*.ts'],
    },
    tags: [
      { name: 'wiki', description: 'GitLab Project Wiki' },
      { name: 'smoke', description: 'Read-only checks for basic availability' },
      { name: 'functional', description: 'Expected feature behavior' },
      {
        name: 'boundary',
        description: 'Behavior at an input or state boundary',
      },
      { name: 'negative', description: 'Rejection and authorization checks' },
      { name: 'e2e', description: 'Multi-step end-to-end flows' },
    ],
    globalSetup: ['./tests/setup/log-run.ts'],
    setupFiles: ['./tests/setup/load-env.ts'],
  },
});
