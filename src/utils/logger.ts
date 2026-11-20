import fs from 'node:fs';
import path from 'node:path';
import pino from 'pino';

const LOG_DIR = process.env.LOG_OUTPUT_DIR || path.resolve(process.cwd(), 'logs');

if (!fs.existsSync(LOG_DIR)) {
  fs.mkdirSync(LOG_DIR, { recursive: true });
}

export const LOG_FILE_PATH = path.join(LOG_DIR, 'execution.log');

const logFileStream = fs.createWriteStream(LOG_FILE_PATH, { flags: 'a' });

export const logger = pino(
  {
    level: process.env.LOG_LEVEL || 'debug',
    redact: {
      paths: [
        'headers.authorization',
        'headers["private-token"]',
        'headers["PRIVATE-TOKEN"]',
        'token',
        'req.headers.authorization',
        'req.headers["private-token"]',
        'password',
      ],
      censor: '[Redacted]',
    },
    base: {
      framework: 'SQE3-GitLab-API',
      env: process.env.NODE_ENV || 'test',
    },
    timestamp: pino.stdTimeFunctions.isoTime,
  },
  logFileStream,
);

export interface RequestLogMeta {
  method: string;
  url: string;
  statusCode: number;
  durationMs: number;
  testCase?: string;
  error?: string;
}

export function logApiTransaction(meta: RequestLogMeta): void {
  const level = meta.statusCode >= 500 ? 'error' : meta.statusCode >= 400 ? 'warn' : 'info';
  logger[level](
    {
      category: 'HTTP_REQUEST',
      method: meta.method,
      endpoint: meta.url,
      statusCode: meta.statusCode,
      latencyMs: meta.durationMs,
      testCase: meta.testCase ?? 'N/A',
      ...(meta.error ? { error: meta.error } : {}),
    },
    `HTTP ${meta.method} ${meta.url} returned status ${meta.statusCode} in ${meta.durationMs}ms`,
  );
}

export function logTestStep(
  testCase: string,
  message: string,
  details?: Record<string, unknown>,
): void {
  logger.info({ category: 'TEST_STEP', testCase, ...details }, `[${testCase}] ${message}`);
}
