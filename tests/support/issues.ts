import fs from 'node:fs';
import path from 'node:path';
import type { Got, Response } from 'got';
import { expect } from 'vitest';
import { createGitLabClient } from '@/api/client.ts';
import { requestManager } from '@/api/request-manager.ts';
import { IssueSchema, IssueListSchema, type Issue } from '@/schemas/issue.schema.ts';
import { logTestStep } from '@/utils/logger.ts';

export interface DynamicJsonCase {
  case_id: string;
  description_scenario: string;
  payload: {
    title?: string;
    description?: string;
    labels?: string;
    confidential?: boolean;
  };
  expected_status: number;
  expected_error?: string;
  sanitization_check?: boolean;
}

export interface CsvEdgeCase {
  case_id: string;
  title: string;
  description: string;
  labels: string;
  confidential: boolean;
  expected_status: number;
  validation_rule: string;
}

export function loadDynamicJsonDatasets(): {
  positive_boundary_cases: DynamicJsonCase[];
  negative_edge_cases: DynamicJsonCase[];
} {
  const filePath = path.resolve(process.cwd(), 'tests/data/issues-dynamic-datasets.json');
  const raw = fs.readFileSync(filePath, 'utf-8');
  return JSON.parse(raw);
}

export function loadCsvEdgeCases(): CsvEdgeCase[] {
  const filePath = path.resolve(process.cwd(), 'tests/data/issues-edge-cases.csv');
  const raw = fs.readFileSync(filePath, 'utf-8').trim().split('\n');
  const [headerLine, ...dataLines] = raw;
  if (!headerLine) return [];

  return dataLines.map((line) => {
    // Simple CSV parser for quoted strings
    const parts = line.match(/(?:^|,)("(?:[^"]|"")*"|[^,]*)/g)?.map((s) => s.replace(/^,/, '').replace(/^"|"$/g, '').trim()) ?? [];
    return {
      case_id: parts[0] ?? '',
      title: parts[1] ?? '',
      description: parts[2] ?? '',
      labels: parts[3] ?? '',
      confidential: parts[4] === 'true',
      expected_status: Number(parts[5] || 200),
      validation_rule: parts[6] ?? '',
    };
  });
}

export function expectJson(response: Response<unknown>, expectedStatus: number): void {
  expect(response.statusCode).toBe(expectedStatus);
  expect(response.headers['content-type']).toContain('application/json');
}

export function expectValidIssue(body: unknown): Issue {
  return IssueSchema.parse(body);
}

export function expectValidIssueList(body: unknown): Issue[] {
  return IssueListSchema.parse(body);
}

export class IssueContext {
  readonly projectId: string;
  readonly baseUrl: string;
  readonly runId: number;
  readonly reporterClient: Got;
  readonly ownerClient: Got;
  readonly guestClient: Got;
  readonly unauthorizedClient: Got;
  private readonly ownedIssueIids = new Set<number>();

  constructor() {
    this.baseUrl = process.env.GITLAB_BASE_URL || 'https://gitlab.com/api/v4';
    this.projectId = process.env.GITLAB_PROJECT_ID || '12345678';
    this.runId = Date.now();

    const tokenReporter = process.env.GITLAB_TOKEN_REPORTER || 'glpat-test-reporter-token';
    const tokenOwner = process.env.GITLAB_TOKEN_OWNER || 'glpat-test-owner-token';
    const tokenGuest = process.env.GITLAB_TOKEN_GUEST || 'glpat-test-guest-token';

    this.reporterClient = createGitLabClient({ baseUrl: this.baseUrl, token: tokenReporter });
    this.ownerClient = createGitLabClient({ baseUrl: this.baseUrl, token: tokenOwner });
    this.guestClient = createGitLabClient({ baseUrl: this.baseUrl, token: tokenGuest });
    this.unauthorizedClient = createGitLabClient({ baseUrl: this.baseUrl, token: 'invalid_token_xyz' });
  }

  trackIssue(iid: number): void {
    this.ownedIssueIids.add(iid);
  }

  getTrackedCount(): number {
    return this.ownedIssueIids.size;
  }

  async createIssueViaManager(
    payload: Record<string, unknown>,
    testCase = 'TC_ISSUE_CREATE',
  ): Promise<Response<Issue | Record<string, unknown>>> {
    logTestStep(testCase, 'Creating issue via Singleton RequestManager', { payload });
    const response = await requestManager.request<Issue>('POST', `projects/${this.projectId}/issues`, {
      client: this.reporterClient,
      json: payload,
      testCase,
    });

    if (response.statusCode === 201 && (response.body as Issue)?.iid) {
      this.trackIssue((response.body as Issue).iid);
    }

    return response;
  }

  async getIssueViaManager(
    iid: number,
    testCase = 'TC_ISSUE_GET',
  ): Promise<Response<Issue | Record<string, unknown>>> {
    logTestStep(testCase, `Retrieving issue iid=${iid} via Singleton RequestManager`);
    return requestManager.request<Issue>('GET', `projects/${this.projectId}/issues/${iid}`, {
      client: this.reporterClient,
      testCase,
    });
  }

  async updateIssueViaManager(
    iid: number,
    payload: Record<string, unknown>,
    testCase = 'TC_ISSUE_UPDATE',
  ): Promise<Response<Issue | Record<string, unknown>>> {
    logTestStep(testCase, `Updating issue iid=${iid} via Singleton RequestManager`, { payload });
    return requestManager.request<Issue>('PUT', `projects/${this.projectId}/issues/${iid}`, {
      client: this.reporterClient,
      json: payload,
      testCase,
    });
  }

  async deleteIssueViaManager(
    iid: number,
    testCase = 'TC_ISSUE_DELETE',
  ): Promise<Response<unknown>> {
    logTestStep(testCase, `Deleting issue iid=${iid} with Owner privileges via Singleton RequestManager`);
    const response = await requestManager.request('DELETE', `projects/${this.projectId}/issues/${iid}`, {
      client: this.ownerClient,
      testCase,
    });
    this.ownedIssueIids.delete(iid);
    return response;
  }

  async cleanupAll(testCase = 'TEARDOWN_CLEANUP'): Promise<void> {
    const totalToClean = this.ownedIssueIids.size;
    if (totalToClean === 0) return;

    logTestStep(testCase, `Executing automated post-condition teardown for ${totalToClean} tracked issues`);
    for (const iid of Array.from(this.ownedIssueIids)) {
      try {
        await requestManager.request('DELETE', `projects/${this.projectId}/issues/${iid}`, {
          client: this.ownerClient,
          testCase,
        });
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        logTestStep(testCase, `Teardown note: issue ${iid} cleanup skipped or already removed`, { error: msg });
      } finally {
        this.ownedIssueIids.delete(iid);
      }
    }
  }
}
