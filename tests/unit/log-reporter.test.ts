import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { generateExecutionReport } from '@/core/log-reporter.ts';

describe('generateExecutionReport', () => {
  let directory: string;

  beforeEach(() => {
    directory = mkdtempSync(join(tmpdir(), 'sqe3-report-test-'));
    vi.stubEnv('LOG_OUTPUT_DIR', directory);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    rmSync(directory, { recursive: true, force: true });
  });

  it('keeps transport failures out of the HTTP status counts and writes both reports', () => {
    const logPath = join(directory, 'execution.jsonl');
    const entries = [
      {
        level: 30,
        category: 'HTTP_REQUEST',
        testCase: 'GET_001',
        method: 'GET',
        statusCode: 200,
        latencyMs: 10,
      },
      {
        level: 40,
        category: 'HTTP_REQUEST',
        testCase: 'GET_002',
        method: 'GET',
        statusCode: 404,
        latencyMs: 20,
      },
      {
        level: 50,
        category: 'REQUEST_FAILURE',
        testCase: 'GET_002',
        method: 'GET',
        latencyMs: 30,
      },
      { level: 30, category: 'TEST_STEP', testCase: 'GET_001' },
      { level: 30, category: 'UNKNOWN' },
    ];
    writeFileSync(
      logPath,
      [
        ...entries.map((entry) => JSON.stringify(entry)),
        'broken JSON',
        '',
      ].join('\n'),
    );

    const summary = generateExecutionReport(logPath);

    expect(summary).toMatchObject({
      totalEntries: 6,
      totalHttpRequests: 3,
      requestFailureCount: 1,
      malformedEntries: 2,
      statusBreakdown: { 200: 1, 404: 1 },
      methodBreakdown: { GET: 3 },
      latencyStats: { minMs: 10, maxMs: 30, avgMs: 20 },
      testCasesCovered: ['GET_001', 'GET_002'],
      errorCount: 1,
      warningCount: 1,
    });
    expect(summary.statusBreakdown).not.toHaveProperty('500');
    expect(
      JSON.parse(
        readFileSync(join(directory, 'execution-report.json'), 'utf8'),
      ),
    ).toEqual(summary);
    const markdown = readFileSync(
      join(directory, 'execution-report.md'),
      'utf8',
    );
    expect(markdown).toContain('**Request Failures:** 1');
    expect(markdown).toContain('**Invalid Log Entries:** 2');
    expect(markdown).toContain('| 404 | 1 |');
  });

  it('selects the most recent run with a log and reports zero latency for step-only runs', () => {
    const olderRun = join(directory, 'run-2026-11-24');
    const latestRun = join(directory, 'run-2026-11-25');
    const emptyRun = join(directory, 'run-2026-11-26');
    for (const run of [olderRun, latestRun, emptyRun]) mkdirSync(run);
    writeFileSync(
      join(olderRun, 'execution.jsonl'),
      JSON.stringify({ level: 30, category: 'TEST_STEP', testCase: 'OLD' }),
    );
    writeFileSync(
      join(latestRun, 'execution.jsonl'),
      JSON.stringify({ level: 30, category: 'TEST_STEP', testCase: 'LATEST' }),
    );

    expect(generateExecutionReport()).toMatchObject({
      totalEntries: 1,
      totalHttpRequests: 0,
      latencyStats: { minMs: 0, maxMs: 0, avgMs: 0 },
      testCasesCovered: ['LATEST'],
    });
  });

  it('reports that no run has a log when the output directory is empty', () => {
    expect(() => generateExecutionReport()).toThrow('No execution log found');
  });
});
