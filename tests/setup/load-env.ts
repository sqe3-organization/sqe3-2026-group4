import { existsSync } from 'node:fs';
import { inject } from 'vitest';

if (existsSync('.env')) {
  process.loadEnvFile('.env');
}

process.env.SQE3_RUN_LOG_PATH = inject('runLogPath');
