import { generateTestReports } from '../generate-test-reports.ts';

const config =
  process.argv[2] ??
  process.env.CT_CONFIG ??
  'scripts/tmp/vitest.ct-wiki.config.ts';

process.exitCode = generateTestReports(config);
