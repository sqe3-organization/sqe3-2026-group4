/**
 * ============================================================================
 * LABORATORY 5 — ACTIVITY #4: CORE FRAMEWORK UNIT TESTING VIA GENAI (YERALDIN VASQUEZ)
 * ============================================================================
 * 
 * Target Component: Issue Domain Endpoints & Zod Schema Validation
 *                   (src/domains/issues/issue.endpoints.ts & issue.schema.ts)
 * LLM Model Utilized: Claude 3.5 Sonnet (Anthropic)
 * 
 * VERBATIM GENAI PROMPT:
 * "Act as a Principal Software Quality Engineer. Generate a comprehensive Vitest unit test
 * suite in TypeScript for our framework's Issue domain components:
 * 1. src/domains/issues/issue.endpoints.ts: verify that 'issueEndpoints.issues(projectId)'
 *    generates 'projects/${projectId}/issues' and 'issueEndpoints.issue(projectId, iid)'
 *    generates 'projects/${projectId}/issues/${iid}'. Test with string IDs, numeric conversions,
 *    and boundary project IDs.
 * 2. src/domains/issues/issue.schema.ts: verify that 'IssueSchema' strictly validates full GitLab
 *    issue payload objects including required fields (id, iid, project_id, title, state, created_at,
 *    confidential, labels, author), optional/nullable fields (description), and rejects malformed
 *    objects missing title or state.
 * 3. Verify 'IssueListSchema' parses arrays of valid issues and rejects non-array inputs.
 * Use pure Vitest assertions (describe, it, expect) in strict TypeScript without network calls."
 * ============================================================================
 */

import { describe, it, expect } from 'vitest';
import { issueEndpoints } from '@/domains/issues/issue.endpoints.ts';
import { IssueSchema, IssueListSchema } from '@/domains/issues/issue.schema.ts';

describe('Unit Tests: Issue Domain Endpoints and Schemas (Yeraldin Vasquez)', () => {
  describe('1. issueEndpoints Route Builders', () => {
    it('UNIT_ISSUE_EP_001: Should correctly construct collection endpoint path', () => {
      expect(issueEndpoints.issues('12345')).toBe('projects/12345/issues');
      expect(issueEndpoints.issues('829471')).toBe('projects/829471/issues');
    });

    it('UNIT_ISSUE_EP_002: Should correctly construct single issue resource path with IID', () => {
      expect(issueEndpoints.issue('12345', 42)).toBe('projects/12345/issues/42');
      expect(issueEndpoints.issue('group/subgroup/project', 101)).toBe('projects/group/subgroup/project/issues/101');
    });
  });

  describe('2. IssueSchema Zod Validation', () => {
    const validIssueRaw = {
      id: 99401,
      iid: 15,
      project_id: 829471,
      title: 'Valid Bug Report Title',
      description: 'Detailed reproducible steps for the defect',
      state: 'opened',
      created_at: '2026-11-27T00:00:00.000Z',
      updated_at: '2026-11-27T01:00:00.000Z',
      confidential: false,
      labels: ['bug', 'triage', 'p1'],
      author: {
        id: 501,
        username: 'yeraldin_qa',
        name: 'Yeraldin Vasquez',
      },
    };

    it('UNIT_ISSUE_SCHEMA_001: Should successfully parse and validate a compliant GitLab issue object', () => {
      const parsed = IssueSchema.parse(validIssueRaw);
      expect(parsed.id).toBe(99401);
      expect(parsed.iid).toBe(15);
      expect(parsed.project_id).toBe(829471);
      expect(parsed.title).toBe('Valid Bug Report Title');
      expect(parsed.description).toBe('Detailed reproducible steps for the defect');
      expect(parsed.state).toBe('opened');
      expect(parsed.confidential).toBe(false);
      expect(parsed.labels).toEqual(['bug', 'triage', 'p1']);
      expect(parsed.author?.username).toBe('yeraldin_qa');
    });

    it('UNIT_ISSUE_SCHEMA_002: Should allow null descriptions per GitLab API v4 specification', () => {
      const issueWithNullDesc = { ...validIssueRaw, description: null };
      const parsed = IssueSchema.parse(issueWithNullDesc);
      expect(parsed.description).toBeNull();
    });

    it('UNIT_ISSUE_SCHEMA_003: Should reject payload missing mandatory title field', () => {
      const { title: _title, ...missingTitle } = validIssueRaw;
      expect(() => IssueSchema.parse(missingTitle)).toThrow();
    });

    it('UNIT_ISSUE_SCHEMA_004: Should reject payload with invalid state value', () => {
      const invalidState = { ...validIssueRaw, state: 'invalid_status_xyz' };
      expect(() => IssueSchema.parse(invalidState)).toThrow();
    });
  });

  describe('3. IssueListSchema Zod Array Validation', () => {
    it('UNIT_ISSUE_LIST_001: Should validate array containing multiple issue items', () => {
      const listRaw = [
        {
          id: 1,
          iid: 1,
          project_id: 10,
          title: 'Issue 1',
          description: null,
          state: 'opened',
          created_at: '2026-11-27T00:00:00.000Z',
          updated_at: '2026-11-27T00:00:00.000Z',
          confidential: false,
          labels: [],
          author: { id: 1, username: 'user1', name: 'User One' },
        },
        {
          id: 2,
          iid: 2,
          project_id: 10,
          title: 'Issue 2',
          description: 'Desc 2',
          state: 'closed',
          created_at: '2026-11-27T00:00:00.000Z',
          updated_at: '2026-11-27T00:00:00.000Z',
          confidential: true,
          labels: ['security'],
          author: { id: 2, username: 'user2', name: 'User Two' },
        },
      ];

      const parsedList = IssueListSchema.parse(listRaw);
      expect(parsedList).toHaveLength(2);
      expect(parsedList[0]?.iid).toBe(1);
      expect(parsedList[1]?.confidential).toBe(true);
    });

    it('UNIT_ISSUE_LIST_002: Should accept empty issue array for new/empty projects', () => {
      const emptyList = IssueListSchema.parse([]);
      expect(emptyList).toEqual([]);
    });

    it('UNIT_ISSUE_LIST_003: Should reject non-array input object', () => {
      expect(() => IssueListSchema.parse({ not: 'an array' })).toThrow();
    });
  });
});
