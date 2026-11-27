import { defineConfig } from 'vitest/config';
import ctConfig from '../vitest.ct.config.ts';

export default defineConfig({
  ...ctConfig,
  test: {
    ...ctConfig.test,
    include: ['tests/integration/wiki.spec.ts'],
  },
});
