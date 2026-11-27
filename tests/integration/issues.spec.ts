import { describe, it, expect, beforeAll, beforeEach, afterEach, afterAll } from 'vitest';
import { RequestManager, requestManager } from '@/core/request-manager.ts';
import {
  IssueContext,
  loadDynamicJsonDatasets,
  loadCsvEdgeCases,
  expectValidIssue,
  expectValidIssueList,
} from '../support/issues.ts';
import { type Issue } from '@/domains/issues/issue.schema.ts';
import { logTestStep } from '@/core/logger.ts';

describe('GitLab REST API v4 — Project Issues Architecture Test Suite (Yeraldin Vasquez)', { tags: ['issues'] }, () => {
  let ctx: IssueContext;
  const dynamicDatasets = loadDynamicJsonDatasets();
  const csvDatasets = loadCsvEdgeCases();

  beforeAll(async () => {
    ctx = new IssueContext();
    await ctx.init();
    expect(ctx.baseUrl).toBeDefined();
    expect(ctx.projectId).toBeDefined();
    expect(requestManager).toBeDefined();
    logTestStep('GLOBAL_SETUP', `Initialized IssueContext and verified RequestManager connectivity on ${ctx.baseUrl}`);
  });

  beforeEach(() => {
    // Reset test metrics
  });

  afterEach(() => {
    // Post-test hook
  });

  afterAll(async () => {
    await ctx.cleanupAll('GLOBAL_TEARDOWN');
  });

  // -------------------------------------------------------------
  // Group 1: Smoke Test Suite (@smoke)
  // -------------------------------------------------------------
  describe('Smoke Test Suite (@smoke)', () => {
    it(
      'TC_ISSUE_SMOKE_001: @smoke Should verify service health via GET /version using RequestManager',
      { tags: ['smoke', 'issues'] },
      async () => {
        const response = await requestManager.request<{ version: string; revision: string }>('GET', 'version', {
          client: ctx.reporterClient,
          testCase: 'TC_ISSUE_SMOKE_001',
        });
        expect(response.statusCode).toBe(200);
        expect(response.body).toBeDefined();
        expect(response.body.version).toBeDefined();
        logTestStep('TC_ISSUE_SMOKE_001', `Service health verified: version=${response.body.version}`);
      },
    );

    it(
      'TC_ISSUE_SMOKE_002: @smoke Should verify RequestManager Singleton enforces a unique global reference',
      { tags: ['smoke', 'issues'] },
      async () => {
        const instanceA = RequestManager.getInstance();
        const instanceB = RequestManager.getInstance();
        const instanceExported = requestManager;

        expect(instanceA).toBe(instanceB);
        expect(instanceB).toBe(instanceExported);
        expect(Object.is(instanceA, instanceExported)).toBe(true);

        const concurrentInstances = await Promise.all([
          RequestManager.getInstance(),
          RequestManager.getInstance(),
          RequestManager.getInstance(),
        ]);
        expect(concurrentInstances[0]).toBe(instanceA);
        expect(concurrentInstances[1]).toBe(instanceA);
        expect(concurrentInstances[2]).toBe(instanceA);
        logTestStep('TC_ISSUE_SMOKE_002', 'Verified Singleton instance reference identity across synchronous and concurrent calls');
      },
    );

    it(
      'TC_ISSUE_SMOKE_003: @smoke Should list project issues and verify array structure',
      { tags: ['smoke', 'issues'] },
      async () => {
        const response = await ctx.listIssuesViaManager('TC_ISSUE_SMOKE_003');
        expect(response.statusCode).toBe(200);
        expect(Array.isArray(response.body)).toBe(true);
        const validatedList = expectValidIssueList(response.body);
        expect(validatedList).toBeDefined();
        logTestStep('TC_ISSUE_SMOKE_003', `Listed project issues: count=${(response.body as Issue[]).length}`);
      },
    );

    it(
      'TC_ISSUE_SMOKE_004: @smoke Should perform basic issue creation and retrieval smoke cycle',
      { tags: ['smoke', 'issues'] },
      async () => {
        const smokePayload = {
          title: `[Smoke] Quick validation issue ${ctx.runId}`,
          description: 'Basic smoke test verifying network pipeline round-trip',
          labels: 'smoke,automation',
        };

        const createRes = await ctx.createIssueViaManager(smokePayload, 'TC_ISSUE_SMOKE_004_CREATE');
        expect(createRes.statusCode).toBe(201);
        const createdIssue = expectValidIssue(createRes.body);
        expect(createdIssue.title).toBe(smokePayload.title);
        expect(createdIssue.iid).toBeGreaterThan(0);

        const getRes = await ctx.getIssueViaManager(createdIssue.iid, 'TC_ISSUE_SMOKE_004_GET');
        expect(getRes.statusCode).toBe(200);
        const retrievedIssue = expectValidIssue(getRes.body);
        expect(retrievedIssue.id).toBe(createdIssue.id);
        logTestStep('TC_ISSUE_SMOKE_004', `Smoke issue round-trip verified for iid=${createdIssue.iid}`);
      },
    );
  });

  // -------------------------------------------------------------
  // Group 2: Dynamic JSON Datasets (@regression)
  // -------------------------------------------------------------
  describe('Regression Test Suite (@regression) — Dynamic JSON Datasets (Claude 3.5 Sonnet)', () => {
    for (const testCase of dynamicDatasets.positive_boundary_cases) {
      it(
        `${testCase.case_id}: @regression Positive Boundary — ${testCase.description_scenario}`,
        { tags: ['boundary', 'functional', 'regression', 'issues'] },
        async () => {
          logTestStep(testCase.case_id, `Running positive boundary test: ${testCase.description_scenario}`);

          const response = await ctx.createIssueViaManager(testCase.payload, testCase.case_id);
          expect(response.statusCode).toBe(201);
          expect(response.headers['content-type']).toContain('application/json');

          const validated = expectValidIssue(response.body);
          expect(validated.title).toBe(testCase.payload.title);

          if (testCase.payload.confidential !== undefined) {
            expect(validated.confidential).toBe(testCase.payload.confidential);
          }
          if (testCase.payload.labels) {
            expect(validated.labels).toBeDefined();
          }

          expect(ctx.getTrackedCount()).toBeGreaterThan(0);
          logTestStep(testCase.case_id, `Created and verified positive boundary issue iid=${validated.iid}`);
        },
      );
    }

    for (const testCase of dynamicDatasets.negative_edge_cases) {
      it(
        `${testCase.case_id}: @regression Negative Edge Case — ${testCase.description_scenario}`,
        { tags: ['negative', 'regression', 'issues'] },
        async () => {
          logTestStep(testCase.case_id, `Running negative edge test: ${testCase.description_scenario}`);

          if (testCase.sanitization_check) {
            const response = await ctx.createIssueViaManager(testCase.payload, testCase.case_id);
            expect(response.statusCode).toBe(201);
            const validated = expectValidIssue(response.body);
            expect(validated.description).toContain('<script>');
            logTestStep(testCase.case_id, `Sanitization payload stored without script execution, iid=${validated.iid}`);
          } else {
            const response = await ctx.createIssueViaManager(testCase.payload, testCase.case_id);
            expect(response.statusCode).toBe(testCase.expected_status);
            expect(response.headers['content-type']).toContain('application/json');
            logTestStep(testCase.case_id, `Negative edge correctly rejected with HTTP ${response.statusCode}`);
          }
        },
      );
    }
  });

  // -------------------------------------------------------------
  // Group 3: Parametric CSV Datasets (@regression)
  // -------------------------------------------------------------
  describe('Regression Test Suite (@regression) — Parametric CSV Datasets', () => {
    for (const row of csvDatasets) {
      it(
        `${row.case_id}: @regression CSV Dataset — ${row.description} (${row.validation_rule})`,
        { tags: ['boundary', 'regression', 'issues'] },
        async () => {
          logTestStep(row.case_id, `Running CSV parametric test: ${row.description}`);

          const payload = {
            title: row.title,
            description: row.description,
            labels: row.labels,
            confidential: row.confidential,
          };

          const response = await ctx.createIssueViaManager(payload, row.case_id);
          expect(response.statusCode).toBe(row.expected_status);

          if (row.expected_status === 201) {
            const validated = expectValidIssue(response.body);
            expect(validated.title).toBe(row.title);
            expect(ctx.getTrackedCount()).toBeGreaterThan(0);
            logTestStep(row.case_id, `CSV row verified with created issue iid=${validated.iid}`);
          } else {
            logTestStep(row.case_id, `CSV negative row rejected with expected status ${row.expected_status}`);
          }
        },
      );
    }
  });

  // -------------------------------------------------------------
  // Group 4: Lifecycle State Transitions & Permissions (@e2e)
  // -------------------------------------------------------------
  describe('Lifecycle State Transitions & Multi-Role Permissions (@regression)', () => {
    let lifecycleIssue: Issue;

    it(
      'TC_ISSUE_LIFECYCLE_001: @regression Create issue for lifecycle validation',
      { tags: ['e2e', 'functional', 'regression', 'issues'] },
      async () => {
        const payload = {
          title: `[Lifecycle] Issue State Machine Test ${ctx.runId}`,
          description: 'Testing opened -> closed -> reopened state machine transitions',
          labels: 'lifecycle,state-machine',
        };

        const response = await ctx.createIssueViaManager(payload, 'TC_ISSUE_LIFECYCLE_001');
        expect(response.statusCode).toBe(201);
        lifecycleIssue = expectValidIssue(response.body);
        expect(lifecycleIssue.state).toBe('opened');
        logTestStep('TC_ISSUE_LIFECYCLE_001', `Lifecycle issue created with iid=${lifecycleIssue.iid}`);
      },
    );

    it(
      'TC_ISSUE_LIFECYCLE_002: @regression Close issue via state_event update',
      { tags: ['e2e', 'functional', 'regression', 'issues'] },
      async () => {
        const response = await ctx.updateIssueViaManager(
          lifecycleIssue.iid,
          { state_event: 'close' },
          'TC_ISSUE_LIFECYCLE_002',
        );
        expect(response.statusCode).toBe(200);
        const updated = expectValidIssue(response.body);
        expect(updated.state).toBe('closed');
        logTestStep('TC_ISSUE_LIFECYCLE_002', `Issue iid=${lifecycleIssue.iid} transitioned to 'closed'`);
      },
    );

    it(
      'TC_ISSUE_LIFECYCLE_003: @regression Reopen closed issue via state_event update',
      { tags: ['e2e', 'functional', 'regression', 'issues'] },
      async () => {
        const response = await ctx.updateIssueViaManager(
          lifecycleIssue.iid,
          { state_event: 'reopen' },
          'TC_ISSUE_LIFECYCLE_003',
        );
        expect(response.statusCode).toBe(200);
        const updated = expectValidIssue(response.body);
        expect(updated.state).toBe('opened');
        logTestStep('TC_ISSUE_LIFECYCLE_003', `Issue iid=${lifecycleIssue.iid} transitioned back to 'opened'`);
      },
    );

    it(
      'TC_ISSUE_AUTH_001: @regression Reject request with invalid authentication token',
      { tags: ['negative', 'regression', 'issues'] },
      async () => {
        const response = await requestManager.request('GET', `projects/${ctx.projectId}/issues`, {
          client: ctx.unauthorizedClient,
          testCase: 'TC_ISSUE_AUTH_001',
        });
        expect(response.statusCode).toBe(401);
        logTestStep('TC_ISSUE_AUTH_001', 'Verified 401 Unauthorized for invalid token');
      },
    );

    it(
      'TC_ISSUE_AUTH_002: @regression Reject issue deletion by Guest user (403 Forbidden)',
      { tags: ['negative', 'regression', 'issues'] },
      async () => {
        const response = await ctx.deleteIssueViaManager(
          lifecycleIssue.iid,
          'TC_ISSUE_AUTH_002',
          ctx.guestClient,
        );
        expect(response.statusCode).toBe(403);
        logTestStep('TC_ISSUE_AUTH_002', 'Verified 403 Forbidden when Guest attempts DELETE on issue');
      },
    );

    it(
      'TC_ISSUE_DELETE_001: @regression Delete issue with Owner privileges and confirm removal',
      { tags: ['e2e', 'functional', 'regression', 'issues'] },
      async () => {
        const delRes = await ctx.deleteIssueViaManager(lifecycleIssue.iid, 'TC_ISSUE_DELETE_001');
        expect([200, 204]).toContain(delRes.statusCode);

        const getRes = await ctx.getIssueViaManager(lifecycleIssue.iid, 'TC_ISSUE_DELETE_CONFIRM');
        expect(getRes.statusCode).toBe(404);
        logTestStep('TC_ISSUE_DELETE_001', `Confirmed complete removal of issue iid=${lifecycleIssue.iid}`);
      },
    );
  });
});
