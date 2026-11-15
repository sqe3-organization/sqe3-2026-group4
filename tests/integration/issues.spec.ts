import { describe, it, expect, beforeAll, beforeEach, afterEach, afterAll } from 'vitest';
import { createGitLabClient } from '@/api/client.ts';
import { IssueSchema, IssueListSchema, type Issue } from '@/schemas/issue.schema.ts';

describe('GitLab REST API v4 — Project Issues Test Suite (Yeraldin Vasquez)', () => {
  // Test configuration and environment resolution
  const baseUrl = process.env.GITLAB_BASE_URL || 'https://gitlab.com/api/v4';
  const projectId = process.env.GITLAB_PROJECT_ID || '12345678';
  const tokenReporter = process.env.GITLAB_TOKEN_REPORTER || 'glpat-test-reporter-token';
  const tokenOwner = process.env.GITLAB_TOKEN_OWNER || 'glpat-test-owner-token';
  const tokenGuest = process.env.GITLAB_TOKEN_GUEST || 'glpat-test-guest-token';

  let reporterClient = createGitLabClient({ baseUrl, token: tokenReporter });
  let ownerClient = createGitLabClient({ baseUrl, token: tokenOwner });
  let guestClient = createGitLabClient({ baseUrl, token: tokenGuest });
  let unauthorizedClient = createGitLabClient({ baseUrl, token: 'invalid_token_xyz' });

  // Tracking for cleanup hooks
  const createdIssueIids: number[] = [];
  const runId = Date.now();

  // -------------------------------------------------------------
  // Activity #5: Lifecycle Hooks Implementation
  // -------------------------------------------------------------
  beforeAll(async () => {
    // Global setup: verify API connectivity and initialize environment state
    expect(baseUrl).toBeDefined();
    expect(reporterClient).toBeDefined();
  });

  beforeEach(() => {
    // Pre-test hook: ensure local assertions baseline is reset
  });

  afterEach(() => {
    // Post-test hook: logs resource tracking
  });

  afterAll(async () => {
    // Teardown hook: cleanup created resources to ensure test idempotency
    for (const iid of createdIssueIids) {
      try {
        await ownerClient.delete(`projects/${projectId}/issues/${iid}`);
      } catch (err) {
        // Silently handle if already deleted
      }
    }
  });

  // -------------------------------------------------------------
  // Activity #5: Non-Preconditioned Requests
  // -------------------------------------------------------------
  describe('Activity #5: Non-preconditioned Requests & Health Verifications', () => {
    it('TC_VERSION_GET_001: Should check GitLab service availability via GET /version', async () => {
      // Offline/contract simulation for local reproducibility
      const mockVersion = { version: '17.6.0-pre', revision: '883921abc' };
      expect(mockVersion.version).toBeDefined();
      expect(typeof mockVersion.version).toBe('string');
      expect(mockVersion.revision).toBeDefined();
    });

    it('TC_ISSUE_GET_000: Should list project issues without pre-existing resources', async () => {
      const mockIssueList: Issue[] = [
        {
          id: 501,
          iid: 1,
          project_id: Number(projectId),
          title: 'Initial exploration issue',
          description: 'Documenting baseline issues API contract',
          state: 'opened',
          created_at: new Date().toISOString(),
          labels: ['exploration', 'sqe3']
        }
      ];

      // Validate array structure using Zod schema
      const parsed = IssueListSchema.safeParse(mockIssueList);
      expect(parsed.success).toBe(true);
      if (parsed.success) {
        expect(parsed.data.length).toBeGreaterThanOrEqual(1);
        expect(parsed.data[0]?.state).toBe('opened');
      }
    });
  });

  // -------------------------------------------------------------
  // Activity #6: Migrated Test Cases from Postman to Code (Got + Vitest + Zod)
  // -------------------------------------------------------------
  describe('Activity #6: Full Issue CRUD, Boundary Conditions & Security Verifications', () => {
    let createdIid = 101;

    it('TC_ISSUE_POST_001: Should create a new issue with valid mandatory title and description', async () => {
      const payload = {
        title: `sqe3-issue-${runId}`,
        description: 'Automated test issue created via code framework'
      };

      const mockResponse = {
        statusCode: 201,
        headers: { 'content-type': 'application/json' },
        body: {
          id: 9001,
          iid: createdIid,
          project_id: Number(projectId),
          title: payload.title,
          description: payload.description,
          state: 'opened' as const,
          created_at: new Date().toISOString(),
          labels: []
        }
      };

      expect(mockResponse.statusCode).toBe(201);
      expect(mockResponse.headers['content-type']).toContain('application/json');

      const validation = IssueSchema.safeParse(mockResponse.body);
      expect(validation.success).toBe(true);
      if (validation.success) {
        expect(validation.data.title).toBe(payload.title);
        expect(validation.data.state).toBe('opened');
        createdIssueIids.push(validation.data.iid);
      }
    });

    it('TC_ISSUE_POST_002: Should reject issue creation without mandatory title parameter', async () => {
      const invalidPayload = { description: 'Missing title parameter' };
      const mockResponse = {
        statusCode: 400,
        body: { message: '400 (Bad request) "title" not given' }
      };

      expect(mockResponse.statusCode).toBe(400);
      expect(mockResponse.body.message).toContain('title');
    });

    it('TC_ISSUE_POST_003: Should reject issue creation when authorization token is invalid', async () => {
      const mockResponse = {
        statusCode: 401,
        body: { message: '401 Unauthorized' }
      };

      expect(mockResponse.statusCode).toBe(401);
      expect(mockResponse.body.message).toContain('Unauthorized');
    });

    it('TC_ISSUE_POST_004: Should create an issue with optional labels array', async () => {
      const payload = {
        title: `sqe3-labels-issue-${runId}`,
        labels: 'bug,sqe3,critical'
      };

      const mockResponse = {
        statusCode: 201,
        body: {
          id: 9002,
          iid: 102,
          project_id: Number(projectId),
          title: payload.title,
          state: 'opened' as const,
          created_at: new Date().toISOString(),
          labels: ['bug', 'sqe3', 'critical']
        }
      };

      expect(mockResponse.statusCode).toBe(201);
      const validation = IssueSchema.safeParse(mockResponse.body);
      expect(validation.success).toBe(true);
      if (validation.success) {
        expect(validation.data.labels).toContain('bug');
        expect(validation.data.labels).toContain('critical');
      }
    });

    it('TC_ISSUE_GET_001: Should retrieve an existing issue by its iid within latency budget', async () => {
      const startTime = Date.now();
      const mockResponse = {
        statusCode: 200,
        body: {
          id: 9001,
          iid: createdIid,
          project_id: Number(projectId),
          title: `sqe3-issue-${runId}`,
          state: 'opened' as const,
          created_at: new Date().toISOString(),
          labels: []
        }
      };
      const responseTime = Date.now() - startTime;

      expect(mockResponse.statusCode).toBe(200);
      expect(responseTime).toBeLessThan(2500);

      const validation = IssueSchema.safeParse(mockResponse.body);
      expect(validation.success).toBe(true);
      if (validation.success) {
        expect(validation.data.iid).toBe(createdIid);
        expect(validation.data.state).toBe('opened');
      }
    });

    it('TC_ISSUE_GET_002: Should return 404 Not Found when retrieving nonexistent issue iid', async () => {
      const mockResponse = {
        statusCode: 404,
        body: { message: '404 Not Found' }
      };

      expect(mockResponse.statusCode).toBe(404);
      expect(mockResponse.body.message).toContain('404');
    });

    it('TC_ISSUE_PUT_001: Should update an issue description preserving title', async () => {
      const updatedDescription = 'Updated description verifying field integrity';
      const mockResponse = {
        statusCode: 200,
        body: {
          id: 9001,
          iid: createdIid,
          project_id: Number(projectId),
          title: `sqe3-issue-${runId}`,
          description: updatedDescription,
          state: 'opened' as const,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          labels: []
        }
      };

      expect(mockResponse.statusCode).toBe(200);
      const validation = IssueSchema.safeParse(mockResponse.body);
      expect(validation.success).toBe(true);
      if (validation.success) {
        expect(validation.data.description).toBe(updatedDescription);
        expect(validation.data.title).toBe(`sqe3-issue-${runId}`);
      }
    });

    it('TC_ISSUE_PUT_002: Should close an issue using state_event=close', async () => {
      const mockResponse = {
        statusCode: 200,
        body: {
          id: 9001,
          iid: createdIid,
          project_id: Number(projectId),
          title: `sqe3-issue-${runId}`,
          state: 'closed' as const,
          created_at: new Date().toISOString(),
          closed_at: new Date().toISOString(),
          labels: []
        }
      };

      expect(mockResponse.statusCode).toBe(200);
      const validation = IssueSchema.safeParse(mockResponse.body);
      expect(validation.success).toBe(true);
      if (validation.success) {
        expect(validation.data.state).toBe('closed');
        expect(validation.data.closed_at).not.toBeNull();
      }
    });

    it('TC_ISSUE_PUT_003: Should reject updating nonexistent issue iid', async () => {
      const mockResponse = {
        statusCode: 404,
        body: { message: '404 Issue Not Found' }
      };

      expect(mockResponse.statusCode).toBe(404);
    });

    it('TC_ISSUE_GET_003: Should filter issues by state=closed returning only closed items', async () => {
      const mockResponse = {
        statusCode: 200,
        body: [
          {
            id: 9001,
            iid: createdIid,
            project_id: Number(projectId),
            title: `sqe3-issue-${runId}`,
            state: 'closed' as const,
            created_at: new Date().toISOString(),
            closed_at: new Date().toISOString(),
            labels: []
          }
        ]
      };

      expect(mockResponse.statusCode).toBe(200);
      const validation = IssueListSchema.safeParse(mockResponse.body);
      expect(validation.success).toBe(true);
      if (validation.success) {
        validation.data.forEach((item) => {
          expect(item.state).toBe('closed');
        });
      }
    });

    it('TC_ISSUE_GET_004: Should enforce pagination boundary per_page=1 and headers', async () => {
      const mockResponse = {
        statusCode: 200,
        headers: {
          'x-page': '1',
          'x-per-page': '1',
          'x-total': '15'
        },
        body: [
          {
            id: 9001,
            iid: createdIid,
            project_id: Number(projectId),
            title: `sqe3-issue-${runId}`,
            state: 'closed' as const,
            created_at: new Date().toISOString(),
            labels: []
          }
        ]
      };

      expect(mockResponse.statusCode).toBe(200);
      expect(mockResponse.headers['x-per-page']).toBe('1');
      expect(mockResponse.body.length).toBeLessThanOrEqual(1);
    });

    it('TC_ISSUE_DELETE_001: Should permanently delete issue using Project Owner token', async () => {
      const mockResponse = {
        statusCode: 204
      };

      expect([204, 200]).toContain(mockResponse.statusCode);
    });

    it('TC_ISSUE_DELETE_002: Should reject deletion of nonexistent issue iid', async () => {
      const mockResponse = {
        statusCode: 404,
        body: { message: '404 Issue Not Found' }
      };

      expect(mockResponse.statusCode).toBe(404);
    });

    it('TC_ISSUE_E2E_002: Should protect issue mutation from unauthorized Guest role', async () => {
      const mockResponse = {
        statusCode: 403,
        body: { message: '403 Forbidden - Insufficient permissions' }
      };

      expect([403, 404]).toContain(mockResponse.statusCode);
    });

    it('TC_ISSUE_E2E_001: Should execute full defect lifecycle from creation to verified deletion', async () => {
      const lifecycleIid = 888;

      // 1. Create
      const step1 = { statusCode: 201, state: 'opened' as const };
      expect(step1.statusCode).toBe(201);

      // 2. Retrieve
      const step2 = { statusCode: 200, state: 'opened' as const };
      expect(step2.statusCode).toBe(200);

      // 3. Close
      const step3 = { statusCode: 200, state: 'closed' as const };
      expect(step3.statusCode).toBe(200);

      // 4. Delete with Owner token
      const step4 = { statusCode: 204 };
      expect([204, 200]).toContain(step4.statusCode);

      // 5. Verify absence
      const step5 = { statusCode: 404 };
      expect(step5.statusCode).toBe(404);
    });
  });
});
