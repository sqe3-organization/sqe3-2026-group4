import fs from 'node:fs';
import path from 'node:path';
import { LOG_FILE_PATH } from './logger.ts';

export interface LogReportSummary {
  generatedAt: string;
  totalEntries: number;
  totalHttpRequests: number;
  statusBreakdown: Record<string, number>;
  methodBreakdown: Record<string, number>;
  latencyStats: {
    minMs: number;
    maxMs: number;
    avgMs: number;
  };
  testCasesCovered: string[];
  errorCount: number;
  warningCount: number;
}

export function generateExecutionReport(): LogReportSummary {
  if (!fs.existsSync(LOG_FILE_PATH)) {
    throw new Error(`Log file not found at ${LOG_FILE_PATH}`);
  }

  const rawLines = fs.readFileSync(LOG_FILE_PATH, 'utf-8').split('\n').filter(Boolean);

  const statusBreakdown: Record<string, number> = {};
  const methodBreakdown: Record<string, number> = {};
  const latencies: number[] = [];
  const testCases = new Set<string>();
  let errorCount = 0;
  let warningCount = 0;
  let httpCount = 0;

  for (const line of rawLines) {
    try {
      const entry = JSON.parse(line);
      if (entry.level >= 50) errorCount++;
      if (entry.level === 40) warningCount++;

      if (entry.testCase && entry.testCase !== 'N/A') {
        testCases.add(entry.testCase);
      }

      if (entry.category === 'HTTP_REQUEST') {
        httpCount++;
        const status = String(entry.statusCode ?? 'unknown');
        statusBreakdown[status] = (statusBreakdown[status] || 0) + 1;

        const method = String(entry.method ?? 'UNKNOWN').toUpperCase();
        methodBreakdown[method] = (methodBreakdown[method] || 0) + 1;

        if (typeof entry.latencyMs === 'number') {
          latencies.push(entry.latencyMs);
        }
      }
    } catch {
      // Ignore unparseable line
    }
  }

  const minMs = latencies.length ? Math.min(...latencies) : 0;
  const maxMs = latencies.length ? Math.max(...latencies) : 0;
  const avgMs = latencies.length
    ? Number((latencies.reduce((a, b) => a + b, 0) / latencies.length).toFixed(2))
    : 0;

  const summary: LogReportSummary = {
    generatedAt: new Date().toISOString(),
    totalEntries: rawLines.length,
    totalHttpRequests: httpCount,
    statusBreakdown,
    methodBreakdown,
    latencyStats: { minMs, maxMs, avgMs },
    testCasesCovered: Array.from(testCases),
    errorCount,
    warningCount,
  };

  const reportDir = path.dirname(LOG_FILE_PATH);
  const jsonReportPath = path.join(reportDir, 'execution-report.json');
  const mdReportPath = path.join(reportDir, 'execution-report.md');

  fs.writeFileSync(jsonReportPath, JSON.stringify(summary, null, 2), 'utf-8');

  const markdown = [
    '# Automated Test Execution Log Report',
    '',
    `- **Generated At:** ${summary.generatedAt}`,
    `- **Total Log Entries:** ${summary.totalEntries}`,
    `- **Total HTTP Requests:** ${summary.totalHttpRequests}`,
    `- **Distinct Test Cases Tracked:** ${summary.testCasesCovered.length}`,
    `- **Errors Logged:** ${summary.errorCount}`,
    `- **Warnings Logged:** ${summary.warningCount}`,
    '',
    '## Latency Metrics (ms)',
    `- **Min Latency:** ${summary.latencyStats.minMs} ms`,
    `- **Average Latency:** ${summary.latencyStats.avgMs} ms`,
    `- **Max Latency:** ${summary.latencyStats.maxMs} ms`,
    '',
    '## HTTP Status Distribution',
    '| HTTP Status | Frequency |',
    '| :--- | :--- |',
    ...Object.entries(summary.statusBreakdown).map(([code, count]) => `| ${code} | ${count} |`),
    '',
    '## HTTP Method Breakdown',
    '| Method | Requests |',
    '| :--- | :--- |',
    ...Object.entries(summary.methodBreakdown).map(([m, count]) => `| ${m} | ${count} |`),
    '',
  ].join('\n');

  fs.writeFileSync(mdReportPath, markdown, 'utf-8');

  return summary;
}

if (process.argv[1]?.endsWith('log-reporter.ts') || process.argv[1]?.endsWith('log-reporter.js')) {
  try {
    const report = generateExecutionReport();
    console.log('Log report successfully generated:');
    console.table({
      'Total Requests': report.totalHttpRequests,
      'Min Latency (ms)': report.latencyStats.minMs,
      'Avg Latency (ms)': report.latencyStats.avgMs,
      'Max Latency (ms)': report.latencyStats.maxMs,
      'Errors': report.errorCount,
      'Warnings': report.warningCount,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('Error generating log report:', msg);
  }
}
