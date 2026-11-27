import { createHash } from 'node:crypto';
import { describe, it, expect, beforeAll } from 'vitest';
import type { Got, Response } from 'got';
import { createGitLabClient } from '@/core/client.ts';
import { DEFAULT_BASE_URL } from '@/core/env.ts';
import { repositoryEndpoints } from '@/domains/repositories/repository.endpoints.ts';
import {
  BlobSchema,
  GitLabErrorSchema,
  GitLabUserSchema,
  RepositoryTreeSchema,
  type RepositoryTree,
  type TreeEntry
} from '@/domains/repositories/repository.schema.ts';

describe('GitLab REST API v4 — Repositories LLTC (Maddock García)', () => {
  const baseUrl = process.env.GITLAB_BASE_URL || DEFAULT_BASE_URL;
  const projectId = process.env.GITLAB_PROJECT_ID || '86160682';
  const ref = process.env.GITLAB_REPOSITORY_REF || 'bee3de554beadc2569fc232da1b807d2f0d47d72';
  const readmeBlobSha = process.env.GITLAB_README_BLOB_SHA || '38475efa6b4cd07666eacc81bafcb9d9c5b4664a';
  const privateProjectId = process.env.GITLAB_PRIVATE_PROJECT_ID || '86430922';
  const privateRef = process.env.GITLAB_PRIVATE_REF || 'master';
  const missingRef = process.env.GITLAB_MISSING_REF || 'sqe3-missing-ref-nonexistent';
  const missingPath = process.env.GITLAB_MISSING_PATH || 'sqe3-absent-path-nonexistent';
  const missingBlobSha = process.env.GITLAB_MISSING_BLOB_SHA || '0000000000000000000000000000000000000000';
  const token = process.env.GITLAB_TOKEN_EDITOR ?? process.env.GLAB_TOKEN ?? process.env.GITLAB_TOKEN ?? '';

  const userAgent = 'SQE3-GitLab-Test-Framework/1.0 (Maddock-Repositories-Module)';
  const editorClient = createGitLabClient({ baseUrl, token, userAgent });
  const anonymousClient = createGitLabClient({ baseUrl, token: '', userAgent });
  const invalidTokenClient = createGitLabClient({ baseUrl, token: 'invalid-token-sqe3', userAgent });

  const treeUrl = repositoryEndpoints.tree(projectId);

  beforeAll(() => {
    expect(token, 'Set GITLAB_TOKEN_EDITOR (or GLAB_TOKEN) in .env; these tests hit gitlab.com').not.toBe('');
  });

  function gitBlobSha(bytes: Buffer): string {
    return createHash('sha1').update(`blob ${bytes.length}\0`).update(bytes).digest('hex');
  }

  async function getTree(
    client: Got,
    searchParams: Record<string, string | number>
  ): Promise<Response<RepositoryTree>> {
    const response = await client.get<RepositoryTree>(treeUrl, { searchParams });
    expect(response.statusCode).toBe(200);
    expect(response.headers['content-type']).toContain('application/json');
    return response;
  }

  describe('01 - Authorization', () => {
    it('AUTH: Should authenticate the editor token via GET /user', async () => {
      const response = await editorClient.get('user');

      expect(response.statusCode).toBe(200);
      expect(response.headers['content-type']).toContain('application/json');

      const user = GitLabUserSchema.parse(response.body);
      expect(typeof user.id).toBe('number');
      expect(typeof user.username).toBe('string');
      expect(user.username.length).toBeGreaterThan(0);
    });
  });

  describe('02 - Repositories LLTCs', () => {
    it('TC_REPO_GET_001: Should list root entries at the pinned revision', async () => {
      const tree = RepositoryTreeSchema.parse((await getTree(editorClient, { ref, recursive: 'false' })).body);

      expect(tree.length).toBeGreaterThan(0);
      expect(tree.some((entry) => entry.name === 'README.md' && entry.type === 'blob')).toBe(true);
      expect(tree.some((entry) => entry.name === 'docs' && entry.type === 'tree')).toBe(true);
      expect(tree.some((entry) => entry.path.includes('/'))).toBe(false);
    });

    it('TC_REPO_GET_002: Should list all nested entries recursively', async () => {
      const tree = RepositoryTreeSchema.parse((await getTree(editorClient, { ref, recursive: 'true' })).body);

      expect(tree.some((entry) => entry.path === 'docs/activity-1.md')).toBe(true);
      expect(tree.some((entry) => entry.path.startsWith('docs/images/'))).toBe(true);

      const readme = tree.find((entry) => entry.path === 'README.md');
      expect(readme).toBeDefined();
      expect(readme?.id).toBe(readmeBlobSha);
    });

    it('TC_REPO_GET_003: Should restrict the listing to the docs directory', async () => {
      const tree = RepositoryTreeSchema.parse(
        (await getTree(editorClient, { ref, path: 'docs', recursive: 'false' })).body
      );

      expect(tree.length).toBeGreaterThan(0);
      expect(tree.every((entry) => entry.path.startsWith('docs/'))).toBe(true);
      expect(tree.some((entry) => entry.path.startsWith('docs/images/'))).toBe(false);
    });

    it('TC_REPO_GET_004: Should resolve the encoded nested path docs%2Fimages', async () => {
      const tree = RepositoryTreeSchema.parse(
        (await getTree(editorClient, { ref, path: 'docs/images', recursive: 'false' })).body
      );

      expect(tree.length).toBeGreaterThan(0);
      expect(tree.every((entry) => /^docs\/images\/[^/]+$/.test(entry.path))).toBe(true);
    });

    it('TC_REPO_GET_005: Should traverse one-entry tree pages without duplicates', async () => {
      const firstPage = await getTree(editorClient, { ref, per_page: 1, page: 1 });
      const pageOne = RepositoryTreeSchema.parse(firstPage.body);

      expect(pageOne).toHaveLength(1);
      expect(firstPage.headers['x-per-page']).toBe('1');
      expect(firstPage.headers['x-total-pages']).toBe('4');

      const collected: TreeEntry[] = [];
      for (let page = 1; page <= Number(firstPage.headers['x-total-pages']); page += 1) {
        const response = await getTree(editorClient, { ref, per_page: 1, page });
        const pageEntries = RepositoryTreeSchema.parse(response.body);
        expect(pageEntries).toHaveLength(1);
        collected.push(...pageEntries);
      }

      expect(collected).toHaveLength(4);
      expect(new Set(collected.map((entry) => entry.id)).size).toBe(4);

      const root = RepositoryTreeSchema.parse((await getTree(editorClient, { ref, recursive: 'false' })).body);
      expect(collected.map((entry) => entry.path).sort()).toEqual(root.map((entry) => entry.path).sort());

      const beyondLastPage = await getTree(editorClient, { ref, per_page: 1, page: 5 });
      expect(RepositoryTreeSchema.parse(beyondLastPage.body)).toHaveLength(0);
    });

    it('TC_REPO_GET_006: Should reject a nonexistent revision and recover at a valid ref', async () => {
      const response = await editorClient.get(treeUrl, { searchParams: { ref: missingRef } });

      expect(response.statusCode).toBe(404);
      const error = GitLabErrorSchema.parse(response.body);
      expect(typeof error.message).toBe('string');

      const recovery = await getTree(editorClient, { ref, recursive: 'false' });
      expect(RepositoryTreeSchema.parse(recovery.body).length).toBeGreaterThan(0);
    });

    it('TC_REPO_GET_007: Should reject a nonexistent tree path and recover at a valid path', async () => {
      const response = await editorClient.get(treeUrl, { searchParams: { ref, path: missingPath } });

      expect(response.statusCode).toBe(404);
      const error = GitLabErrorSchema.parse(response.body);
      expect(error.message).toMatch(/404.*not found/i);

      const recovery = await getTree(editorClient, { ref, path: 'docs', recursive: 'false' });
      expect(RepositoryTreeSchema.parse(recovery.body).length).toBeGreaterThan(0);
    });

    it('TC_REPO_GET_008: Should retrieve blob metadata and Base64 content with a verifiable SHA', async () => {
      const response = await editorClient.get(repositoryEndpoints.blob(projectId, readmeBlobSha));

      expect(response.statusCode).toBe(200);
      expect(response.headers['content-type']).toContain('application/json');

      const blob = BlobSchema.parse(response.body);
      expect(blob.sha).toBe(readmeBlobSha);
      expect(blob.encoding).toBe('base64');
      expect(blob.size).toBe(194);

      const decoded = Buffer.from(blob.content, 'base64');
      expect(decoded.toString('utf8')).toContain('# Laboratorio Semana 1');
      expect(decoded).toHaveLength(blob.size);
      expect(gitBlobSha(decoded)).toBe(readmeBlobSha);
    });

    it('TC_REPO_GET_009: Should retrieve raw UTF-8 blob bytes with a verifiable SHA', async () => {
      const response = await editorClient.get(repositoryEndpoints.rawBlob(projectId, readmeBlobSha), { responseType: 'text' });

      expect(response.statusCode).toBe(200);
      expect(response.body).toContain('# Laboratorio Semana 1');
      expect(gitBlobSha(Buffer.from(response.body, 'utf8'))).toBe(readmeBlobSha);
    });

    it('TC_REPO_GET_010: Should read a public tree without credentials and match the authenticated baseline', async () => {
      const anonymous = RepositoryTreeSchema.parse(
        (await getTree(anonymousClient, { ref, recursive: 'false' })).body
      );
      const authenticated = RepositoryTreeSchema.parse(
        (await getTree(editorClient, { ref, recursive: 'false' })).body
      );

      expect(anonymous.length).toBeGreaterThan(0);
      expect(anonymous.some((entry) => entry.name === 'README.md')).toBe(true);
      expect(anonymous).toEqual(authenticated);
    });

    it('TC_REPO_GET_011: Should reject an unavailable blob ID and recover at a valid blob', async () => {
      const response = await editorClient.get(repositoryEndpoints.blob(projectId, missingBlobSha));

      expect(response.statusCode).toBe(404);
      const error = GitLabErrorSchema.parse(response.body);
      expect(typeof error.message).toBe('string');

      const recovery = await editorClient.get(repositoryEndpoints.blob(projectId, readmeBlobSha));
      expect(recovery.statusCode).toBe(200);
    });

    it('TC_REPO_GET_012: Should reject raw retrieval of an unavailable blob with an error payload', async () => {
      const response = await editorClient.get(repositoryEndpoints.rawBlob(projectId, missingBlobSha), { responseType: 'text' });

      expect(response.statusCode).toBe(404);
      expect(response.headers['content-type']).toContain('application/json');

      const error = GitLabErrorSchema.parse(JSON.parse(response.body));
      expect(error.message).toMatch(/not found/i);
    });

    it('TC_REPO_GET_013: Should mask the private repository from anonymous reads and allow the editor', async () => {
      const anonymous = await anonymousClient.get(repositoryEndpoints.tree(privateProjectId), {
        searchParams: { ref: privateRef }
      });

      expect(anonymous.statusCode).toBe(404);

      const authenticated = await editorClient.get(repositoryEndpoints.tree(privateProjectId), {
        searchParams: { ref: privateRef }
      });
      expect(authenticated.statusCode).toBe(200);
      expect(RepositoryTreeSchema.parse(authenticated.body).length).toBeGreaterThan(0);
    });

    it('TC_REPO_GET_014: Should reject an invalid token and recover with the editor token', async () => {
      const response = await invalidTokenClient.get(treeUrl, { searchParams: { ref } });

      expect(response.statusCode).toBe(401);
      const error = GitLabErrorSchema.parse(response.body);
      expect(error.message).toMatch(/401.*unauthorized/i);

      const recovery = await getTree(editorClient, { ref, recursive: 'false' });
      expect(RepositoryTreeSchema.parse(recovery.body).length).toBeGreaterThan(0);
    });

    it('TC_REPO_E2E_001: Should browse and read the same immutable file end to end', async () => {
      const root = RepositoryTreeSchema.parse((await getTree(editorClient, { ref, recursive: 'false' })).body);
      expect(root.length).toBeGreaterThan(0);

      const recursive = RepositoryTreeSchema.parse((await getTree(editorClient, { ref, recursive: 'true' })).body);
      const readme = recursive.find((entry) => entry.path === 'README.md');
      if (!readme) {
        throw new Error('README.md not found in the recursive tree');
      }
      const sha = readme.id;

      const blobResponse = await editorClient.get(repositoryEndpoints.blob(projectId, sha));
      expect(blobResponse.statusCode).toBe(200);
      const blob = BlobSchema.parse(blobResponse.body);
      expect(blob.sha).toBe(sha);
      expect(blob.size).toBe(194);

      const rawResponse = await editorClient.get(repositoryEndpoints.rawBlob(projectId, sha), { responseType: 'text' });
      expect(rawResponse.statusCode).toBe(200);
      expect(rawResponse.body).toBe(Buffer.from(blob.content, 'base64').toString('utf8'));

      const secondRecursive = RepositoryTreeSchema.parse(
        (await getTree(editorClient, { ref, recursive: 'true' })).body
      );
      expect(secondRecursive).toEqual(recursive);
    });
  });
});
