import { appendFileSync, mkdirSync, mkdtempSync } from 'node:fs';
import { join, resolve } from 'node:path';
import pino, { type Logger } from 'pino';

export const LOG_FILE_NAME = 'execution.jsonl';

export function createRunLogPath(): string {
  const root = resolve(process.env.LOG_OUTPUT_DIR || 'logs');
  mkdirSync(root, { recursive: true });
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const directory = mkdtempSync(join(root, `run-${timestamp}-`));
  return join(directory, LOG_FILE_NAME);
}

let activeLog: { path: string; logger: Logger } | undefined;

function getLogger(): Logger {
  const logPath =
    process.env.SQE3_RUN_LOG_PATH || activeLog?.path || createRunLogPath();
  if (activeLog?.path === logPath) return activeLog.logger;
  const logger = pino(
    {
      level: process.env.LOG_LEVEL || 'info',
      base: { framework: 'SQE3-GitLab-API' },
      timestamp: pino.stdTimeFunctions.isoTime,
    },
    {
      write(line) {
        appendFileSync(logPath, line, { mode: 0o600 });
      },
    },
  );
  activeLog = { path: logPath, logger };
  return logger;
}

interface RequestLogMeta {
  method: string;
  durationMs: number;
  testCase?: string;
}

export function logApiTransaction(
  meta: RequestLogMeta & { statusCode: number },
): void {
  const { method, statusCode, durationMs, testCase } = meta;
  const level =
    statusCode >= 500 ? 'error' : statusCode >= 400 ? 'warn' : 'info';
  getLogger()[level](
    {
      category: 'HTTP_REQUEST',
      method,
      statusCode,
      latencyMs: durationMs,
      testCase,
    },
    `HTTP ${method} returned ${statusCode}`,
  );
}

export function logRequestFailure(
  meta: RequestLogMeta & { statusCode?: number; errorCode: string },
): void {
  const { method, statusCode, durationMs, testCase, errorCode } = meta;
  getLogger().error(
    {
      category: 'REQUEST_FAILURE',
      method,
      statusCode,
      latencyMs: durationMs,
      testCase,
      errorCode,
    },
    `HTTP ${method} failed (${errorCode})`,
  );
}

export function logTestStep(testCase: string, message: string): void {
  getLogger().info({ category: 'TEST_STEP', testCase }, message);
}
