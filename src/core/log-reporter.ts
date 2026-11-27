import { existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { z } from 'zod';
import { LOG_FILE_NAME } from './logger.ts';

const LogEntry = z.object({
  level: z.number(),
  category: z.enum(['HTTP_REQUEST', 'REQUEST_FAILURE', 'TEST_STEP']),
  testCase: z.string().optional(),
  method: z.string().optional(),
  statusCode: z.number().int().min(100).max(599).optional(),
  latencyMs: z.number().min(0).optional(),
});

function latestLogPath(): string {
  const root = resolve(process.env.LOG_OUTPUT_DIR || 'logs');
  if (existsSync(root)) {
    const runDirectories = readdirSync(root, { withFileTypes: true })
      .filter((entry) => entry.isDirectory() && entry.name.startsWith('run-'))
      .map((entry) => entry.name)
      .sort()
      .reverse();
    for (const directory of runDirectories) {
      const file = join(root, directory, LOG_FILE_NAME);
      if (existsSync(file)) return file;
    }
    const legacyPath = join(root, 'execution.log');
    if (existsSync(legacyPath)) return legacyPath;
  }
  throw new Error(
    `No execution log found in ${root}. Pass a log file path or run the tests first.`,
  );
}

export function generateExecutionReport(logPath = latestLogPath()) {
  const statusBreakdown = new Map<number, number>();
  const methodBreakdown = new Map<string, number>();
  const testCasesCovered = new Set<string>();
  let totalEntries = 0;
  let totalHttpRequests = 0;
  let requestFailureCount = 0;
  let malformedEntries = 0;
  let errorCount = 0;
  let warningCount = 0;
  let minMs = Infinity;
  let maxMs = 0;
  let totalMs = 0;
  let latencySamples = 0;

  for (const line of readFileSync(logPath, 'utf-8').split('\n')) {
    if (!line.trim()) continue;
    totalEntries++;

    let data: unknown;
    try {
      data = JSON.parse(line);
    } catch {
      malformedEntries++;
      continue;
    }

    const result = LogEntry.safeParse(data);
    if (!result.success) {
      malformedEntries++;
      continue;
    }

    const { level, category, testCase, method, statusCode, latencyMs } =
      result.data;
    if (level >= 50) errorCount++;
    if (level === 40) warningCount++;
    if (testCase && testCase !== 'N/A') testCasesCovered.add(testCase);
    if (category === 'TEST_STEP') continue;

    totalHttpRequests++;
    if (category === 'REQUEST_FAILURE') requestFailureCount++;
    if (method)
      methodBreakdown.set(method, (methodBreakdown.get(method) ?? 0) + 1);
    if (statusCode !== undefined) {
      statusBreakdown.set(
        statusCode,
        (statusBreakdown.get(statusCode) ?? 0) + 1,
      );
    }
    if (latencyMs !== undefined) {
      minMs = Math.min(minMs, latencyMs);
      maxMs = Math.max(maxMs, latencyMs);
      totalMs += latencyMs;
      latencySamples++;
    }
  }

  const summary = {
    generatedAt: new Date().toISOString(),
    totalEntries,
    totalHttpRequests,
    requestFailureCount,
    malformedEntries,
    statusBreakdown: Object.fromEntries(statusBreakdown),
    methodBreakdown: Object.fromEntries(methodBreakdown),
    latencyStats: {
      minMs: latencySamples ? minMs : 0,
      maxMs,
      avgMs: latencySamples ? Number((totalMs / latencySamples).toFixed(2)) : 0,
    },
    testCasesCovered: [...testCasesCovered].sort(),
    errorCount,
    warningCount,
  };

  const markdown = [
    '# Automated Test Execution Log Report',
    '',
    `- **Generated At:** ${summary.generatedAt}`,
    `- **Total Log Entries:** ${totalEntries}`,
    `- **Total HTTP Requests:** ${totalHttpRequests}`,
    `- **Request Failures:** ${requestFailureCount}`,
    `- **Invalid Log Entries:** ${malformedEntries}`,
    `- **Distinct Test Cases Tracked:** ${testCasesCovered.size}`,
    `- **Errors Logged:** ${errorCount}`,
    `- **Warnings Logged:** ${warningCount}`,
    '',
    '## Latency Metrics (ms)',
    `- **Min Latency:** ${summary.latencyStats.minMs} ms`,
    `- **Average Latency:** ${summary.latencyStats.avgMs} ms`,
    `- **Max Latency:** ${summary.latencyStats.maxMs} ms`,
    '',
    '## HTTP Status Distribution',
    '| HTTP Status | Frequency |',
    '| :--- | :--- |',
    ...Object.entries(summary.statusBreakdown).map(
      ([code, count]) => `| ${code} | ${count} |`,
    ),
    '',
    '## HTTP Method Breakdown',
    '| Method | Requests |',
    '| :--- | :--- |',
    ...Object.entries(summary.methodBreakdown).map(
      ([method, count]) => `| ${method} | ${count} |`,
    ),
    '',
  ].join('\n');

  const directory = dirname(logPath);
  writeFileSync(
    join(directory, 'execution-report.json'),
    JSON.stringify(summary, null, 2) + '\n',
  );
  writeFileSync(join(directory, 'execution-report.md'), markdown);
  return summary;
}

if (import.meta.main) {
  try {
    const logPath = process.argv[2] || latestLogPath();
    const summary = generateExecutionReport(logPath);
    console.log(`Reports saved in ${dirname(resolve(logPath))}`);
    console.table({
      Requests: summary.totalHttpRequests,
      'Request failures': summary.requestFailureCount,
      'Invalid entries': summary.malformedEntries,
      'Avg. latency (ms)': summary.latencyStats.avgMs,
    });
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
