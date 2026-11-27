import { existsSync } from 'node:fs';
import type { TestProject } from 'vitest/node';
import { generateExecutionReport } from '../../src/core/log-reporter.ts';
import { createRunLogPath } from '../../src/core/logger.ts';

declare module 'vitest' {
  interface ProvidedContext {
    runLogPath: string;
  }
}

export function setup(project: TestProject): () => void {
  let runLogPath = createRunLogPath();
  project.provide('runLogPath', runLogPath);

  const reportRun = () => {
    if (!existsSync(runLogPath)) return;
    generateExecutionReport(runLogPath);
    console.log(`Execution log and reports: ${runLogPath}`);
  };

  project.onTestsRerun(() => {
    reportRun();
    runLogPath = createRunLogPath();
    project.provide('runLogPath', runLogPath);
  });

  return reportRun;
}
