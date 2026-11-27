import { join } from 'node:path';
import { defineConfig } from 'vitest/config';
import baseConfig from '../vitest.config.ts';

const reportDir = process.env.CT_REPORT_OUTPUT;
if (!reportDir)
  throw new Error('Run this configuration through the CT report script.');

export default defineConfig({
  ...baseConfig,
  test: {
    ...baseConfig.test,
    include: ['tests/integration/**/*.spec.ts'],
    reporters: [
      'default',
      ['junit', { outputFile: join(reportDir, 'junit.xml') }],
      ['html', { outputDir: reportDir, singleFile: true }],
    ],
  },
});
