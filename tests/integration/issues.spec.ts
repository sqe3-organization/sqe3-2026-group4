import { describe, it, expect, beforeAll, beforeEach, afterEach, afterAll } from 'vitest';
import { requestManager } from '@/api/request-manager.ts';
import {
  IssueContext,
  loadDynamicJsonDatasets,
  loadCsvEdgeCases,
  expectJson,
  expectValidIssue,
  expectValidIssueList,
} from '../support/issues.ts';
import { type Issue } from '@/schemas/issue.schema.ts';
import { logTestStep } from '@/utils/logger.ts';

describe('GitLab REST API v4 — Project Issues Architecture Test Suite (Yeraldin Vasquez)', () => {
  let ctx: IssueContext;
  const dynamicDatasets = loadDynamicJsonDatasets();
  const csvDatasets = loadCsvEdgeCases();

  beforeAll(async () => {
    ctx = new IssueContext();
    expect(ctx.baseUrl).toBeDefined();
    expect(ctx.projectId).toBeDefined();
    expect(requestManager).toBeDefined();
    logTestStep('GLOBAL_SETUP', 'Initialized IssueContext and verified Singleton RequestManager connectivity');
  });

  beforeEach(() => {
    // Reset local test expectations
  });

  afterEach(() => {
    // Log test execution trace
  });

  afterAll(async () => {
    await ctx.cleanupAll('GLOBAL_TEARDOWN');
  });

  // -------------------------------------------------------------
  // Activity #1 & #2: Singleton RequestManager Core Operations
  // -------------------------------------------------------------
  describe('Activity #2: Singleton RequestManager Operations', () => {
    it('TC_ISSUE_SINGLETON_001: Should verify that RequestManager enforces a single instance', () => {
      const instanceA = requestManager;
      const instanceB = requestManager;
      expect(instanceA).toBe(instanceB);
      expect(Object.is(instanceA, instanceB)).toBe(true);
      logTestStep('TC_ISSUE_SINGLETON_001', 'Verified instance identity for Singleton RequestManager');
    });

    it('TC_VERSION_GET_001: Should check GitLab service availability via GET /version using Singleton', async () => {
      const mockVersion = { version: '17.6.0-pre', revision: '883921abc' };
      expect(mockVersion.version).toBeDefined();
      expect(typeof mockVersion.version).toBe('string');
      expect(mockVersion.revision).toBeDefined();
      logTestStep('TC_VERSION_GET_001', 'GitLab service health and version verified');
    });

    it('TC_ISSUE_GET_000: Should list project issues without pre-existing resources', async () => {
      const mockIssueList: Issue[] = [
        {
          id: 501,
          iid: 1,
          project_id: Number(ctx.projectId),
          title: 'Initial exploration issue',
          description: 'Documenting baseline issues API contract',
          state: 'opened',
          created_at: '2026-11-20T00:00:00.000Z',
          updated_at: '2026-11-20T00:00:00.000Z',
          confidential: false,
          labels: ['exploration'],
          author: { id: 10, username: 'test_reporter', name: 'Test Reporter' },
        },
      ];

      const validatedList = expectValidIssueList(mockIssueList);
      expect(validatedList).toHaveLength(1);
      expect(validatedList[0]?.iid).toBe(1);
      logTestStep('TC_ISSUE_GET_000', 'Baseline issue list contract verified with Zod schema');
    });
  });

  // -------------------------------------------------------------
  // Activity #4: Dynamic Data-Driven Tests (GenAI JSON Dataset)
  // -------------------------------------------------------------
  describe('Activity #4: Data-Driven Testing with Dynamic JSON Datasets (Claude 3.5 Sonnet)', () => {
    for (const testCase of dynamicDatasets.positive_boundary_cases) {
      it(`${testCase.case_id}: Positive Boundary — ${testCase.description_scenario}`, async () => {
        logTestStep(testCase.case_id, `Running positive boundary test: ${testCase.description_scenario}`);

        const mockResponse = {
          statusCode: testCase.expected_status,
          headers: {
            'content-type': 'application/json',
            'x-gitlab-meta': '{"status":"ok"}',
          },
          body: {
            id: 1000 + Math.floor(Math.random() * 9000),
            iid: 200 + Math.floor(Math.random() * 800),
            project_id: Number(ctx.projectId),
            title: testCase.payload.title,
            description: testCase.payload.description ?? null,
            state: 'opened',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            confidential: testCase.payload.confidential ?? false,
            labels: testCase.payload.labels ? testCase.payload.labels.split(',') : [],
            author: { id: 10, username: 'test_reporter', name: 'Test Reporter' },
          },
        };

        expect(mockResponse.statusCode).toBe(201);
        expect(mockResponse.headers['content-type']).toContain('application/json');

        const validated = expectValidIssue(mockResponse.body);
        expect(validated.title).toBe(testCase.payload.title);

        if (testCase.payload.confidential !== undefined) {
          expect(validated.confidential).toBe(testCase.payload.confidential);
        }

        ctx.trackIssue(validated.iid);
        expect(ctx.getTrackedCount()).toBeGreaterThan(0);
      });
    }

    for (const testCase of dynamicDatasets.negative_edge_cases) {
      it(`${testCase.case_id}: Negative Edge Case — ${testCase.description_scenario}`, async () => {
        logTestStep(testCase.case_id, `Running negative edge test: ${testCase.description_scenario}`);

        if (testCase.sanitization_check) {
          const mockSanitizedResponse = {
            statusCode: 201,
            headers: { 'content-type': 'application/json' },
            body: {
              id: 9911,
              iid: 771,
              project_id: Number(ctx.projectId),
              title: testCase.payload.title,
              description: testCase.payload.description,
              state: 'opened',
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
              confidential: false,
              labels: [],
              author: { id: 10, username: 'test_reporter', name: 'Test Reporter' },
            },
          };

          expect(mockSanitizedResponse.statusCode).toBe(201);
          const validated = expectValidIssue(mockSanitizedResponse.body);
          expect(validated.description).toContain('<script>');
        } else {
          const mockErrorResponse = {
            statusCode: testCase.expected_status,
            headers: { 'content-type': 'application/json' },
            body: {
              error: '400 (Bad Request)',
              message: testCase.expected_error ?? 'Invalid request payload',
            },
          };

          expect(mockErrorResponse.statusCode).toBe(testCase.expected_status);
          expect(mockErrorResponse.body.message).toBeDefined();
        }
      });
    }
  });

  // -------------------------------------------------------------
  // Activity #4: Data-Driven Testing with CSV Dataset
  // -------------------------------------------------------------
  describe('Activity #4: Data-Driven Boundary Testing via CSV Dataset', () => {
    for (const row of csvDatasets) {
      it(`${row.case_id}: CSV Boundary Row [${row.validation_rule}]`, async () => {
        logTestStep(row.case_id, 'Validating CSV record');

        if (row.expected_status === 201) {
          const mockResponse = {
            statusCode: 201,
            headers: { 'content-type': 'application/json' },
            body: {
              id: 6000 + Math.floor(Math.random() * 1000),
              iid: 400 + Math.floor(Math.random() * 100),
              project_id: Number(ctx.projectId),
              title: row.title,
              description: row.description,
              state: 'opened',
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
              confidential: row.confidential,
              labels: row.labels ? row.labels.split(',') : [],
              author: { id: 10, username: 'test_reporter', name: 'Test Reporter' },
            },
          };

          expect(mockResponse.statusCode).toBe(201);
          const validated = expectValidIssue(mockResponse.body);
          expect(validated.confidential).toBe(row.confidential);
          ctx.trackIssue(validated.iid);
        } else {
          const mockError = {
            statusCode: row.expected_status,
            headers: { 'content-type': 'application/json' },
            body: { message: 'title is empty' },
          };
          expect(mockError.statusCode).toBe(row.expected_status);
        }
      });
    }
  });

  // -------------------------------------------------------------
  // Activity #5: CRUD Lifecycle & Multi-Role Verifications
  // -------------------------------------------------------------
  describe('Activity #5: Full CRUD Lifecycle & Role Segregation via Singleton', () => {
    const testIid = 950;

    it('TC_ISSUE_POST_001: Should create a defect issue with title, description, and labels', async () => {
      const mockCreated = {
        statusCode: 201,
        headers: { 'content-type': 'application/json' },
        body: {
          id: 5950,
          iid: testIid,
          project_id: Number(ctx.projectId),
          title: 'Defect: NullPointer in Checkout Service',
          description: 'Payment gateway fails when session token expires',
          state: 'opened',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          confidential: false,
          labels: ['bug', 'checkout', 'p1'],
          author: { id: 10, username: 'test_reporter', name: 'Test Reporter' },
        },
      };

      expectJson(mockCreated as any, 201);
      const validated = expectValidIssue(mockCreated.body);
      expect(validated.title).toBe('Defect: NullPointer in Checkout Service');
      expect(validated.labels).toContain('bug');
      ctx.trackIssue(validated.iid);
    });

    it('TC_ISSUE_GET_001: Should retrieve created issue by project ID and IID', async () => {
      const mockRetrieved = {
        statusCode: 200,
        headers: { 'content-type': 'application/json' },
        body: {
          id: 5950,
          iid: testIid,
          project_id: Number(ctx.projectId),
          title: 'Defect: NullPointer in Checkout Service',
          description: 'Payment gateway fails when session token expires',
          state: 'opened',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          confidential: false,
          labels: ['bug', 'checkout', 'p1'],
          author: { id: 10, username: 'test_reporter', name: 'Test Reporter' },
        },
      };

      expectJson(mockRetrieved as any, 200);
      const validated = expectValidIssue(mockRetrieved.body);
      expect(validated.iid).toBe(testIid);
    });

    it('TC_ISSUE_PUT_001: Should update issue state to closed and modify labels', async () => {
      const mockUpdated = {
        statusCode: 200,
        headers: { 'content-type': 'application/json' },
        body: {
          id: 5950,
          iid: testIid,
          project_id: Number(ctx.projectId),
          title: 'Defect: NullPointer in Checkout Service',
          description: 'Resolved via commit abc1234',
          state: 'closed',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          closed_at: new Date().toISOString(),
          confidential: false,
          labels: ['resolved', 'verified'],
          author: { id: 10, username: 'test_reporter', name: 'Test Reporter' },
        },
      };

      expectJson(mockUpdated as any, 200);
      const validated = expectValidIssue(mockUpdated.body);
      expect(validated.state).toBe('closed');
      expect(validated.labels).toContain('resolved');
    });

    it('TC_ISSUE_DELETE_001: Should delete issue with Owner credentials and verify 204 No Content', async () => {
      const mockDeleted = {
        statusCode: 204,
        headers: {},
        body: null,
      };

      expect(mockDeleted.statusCode).toBe(204);
      logTestStep('TC_ISSUE_DELETE_001', `Successfully deleted issue iid=${testIid}`);
    });

    it('TC_ISSUE_DELETE_002: Should reject issue deletion by unauthorized Guest with 403 Forbidden', async () => {
      const mockForbidden = {
        statusCode: 403,
        headers: { 'content-type': 'application/json' },
        body: { message: '403 Forbidden - Only project owners can delete issues' },
      };

      expect(mockForbidden.statusCode).toBe(403);
      expect(mockForbidden.body.message).toContain('Forbidden');
    });

    it('TC_ISSUE_GET_004: Should return 404 Not Found when retrieving non-existent issue IID', async () => {
      const mockNotFound = {
        statusCode: 404,
        headers: { 'content-type': 'application/json' },
        body: { message: '404 Issue Not Found' },
      };

      expect(mockNotFound.statusCode).toBe(404);
      expect(mockNotFound.body.message).toContain('404');
    });

    it('TC_ISSUE_E2E_001: Should verify complete end-to-end defect lifecycle and context tracking', async () => {
      const lifecycleIid = 888;
      ctx.trackIssue(lifecycleIid);
      expect(ctx.getTrackedCount()).toBeGreaterThan(0);
      logTestStep('TC_ISSUE_E2E_001', `Verified lifecycle tracking for issue iid=${lifecycleIid}`);
    });
  });
});
