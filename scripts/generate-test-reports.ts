import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync } from 'node:fs';
import { join, resolve } from 'node:path';

export function generateTestReports(
  config = 'scripts/vitest.ct.config.ts',
): number {
  const reportRoot = resolve('reports/ct');
  mkdirSync(reportRoot, { recursive: true });
  const reportDir = mkdtempSync(join(reportRoot, 'run-'));
  console.log(`CT reports: ${reportDir}`);

  const result = spawnSync('bun', ['run', 'test', '--config', config], {
    env: {
      ...process.env,
      CT_REPORT_OUTPUT: reportDir,
      LOG_OUTPUT_DIR: join(reportDir, 'logs'),
    },
    stdio: 'inherit',
  });

  if (result.error) console.error(result.error.message);
  return result.status ?? 1;
}

if (import.meta.main) process.exitCode = generateTestReports();
