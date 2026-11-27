import { generateTestReports } from '../generate-test-reports.ts';

process.exitCode = generateTestReports('scripts/tmp/vitest.ct-wiki.config.ts');
