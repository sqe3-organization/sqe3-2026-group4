import { describe, expect } from 'vitest';
import { WikiPageContentListSchema } from '@/schemas/wiki.schema.ts';
import { expectError, expectJson, test } from '@tests/support/wiki.ts';

describe(
  'GitLab REST API v4 — Project Wiki LLTC (Matthew)',
  { concurrent: false, timeout: 60_000 },
  () => {
    describe('POST', () => {
      test('TC_WIKI_POST_001: Create a guide with valid data', async ({
        wiki,
      }) => {
        const page = wiki.createdPage(await wiki.create());
        await wiki.expectSaved(page);
      });

      test('TC_WIKI_POST_002: Reject creation without a title', async ({
        wiki,
      }) => {
        const before = (await wiki.list()).map((page) => page.slug).sort();
        const response = await wiki.create({
          content: wiki.initialContent,
          format: 'markdown',
        });
        expectError(response, 400);
        expect((await wiki.list()).map((page) => page.slug).sort()).toEqual(
          before,
        );
      });

      test('TC_WIKI_POST_003: Reject creation without content', async ({
        wiki,
      }) => {
        expectError(
          await wiki.create({ title: wiki.title, format: 'markdown' }),
          400,
        );
        expect(
          (await wiki.list()).some((page) => page.slug === wiki.title),
        ).toBe(false);
        await wiki.expectAbsent(wiki.title);
      });

      test('TC_WIKI_POST_004: Reject creation with an invalid token', async ({
        wiki,
      }) => {
        const response = await wiki.create(
          { title: wiki.title, content: wiki.initialContent },
          'invalid',
        );
        expectError(response, 401);
        expect(
          (await wiki.list()).some((page) => page.slug === wiki.title),
        ).toBe(false);
        await wiki.expectAbsent(wiki.title);
      });

      test('TC_WIKI_POST_005: Create without an explicit format', async ({
        wiki,
      }) => {
        const response = await wiki.create({
          title: wiki.title,
          content: wiki.initialContent,
        });
        const page = wiki.createdPage(response);
        await wiki.expectSaved(page);
      });
    });

    describe('PUT', () => {
      test('TC_WIKI_PUT_001: Update only a guide’s content', async ({
        wiki,
      }) => {
        const page = await wiki.createPage();
        const response = await wiki.request('PUT', wiki.pageUrl(page.slug), {
          json: { content: wiki.updatedContent },
        });
        wiki.expectPage(response, page, wiki.updatedContent);
        await wiki.expectSaved(page, wiki.updatedContent);
      });

      test('TC_WIKI_PUT_002: Preserve a page when updating with an empty body', async ({
        wiki,
      }) => {
        const page = await wiki.createPage();
        wiki.expectPage(
          await wiki.request('PUT', wiki.pageUrl(page.slug), {
            json: {},
          }),
          page,
        );
        await wiki.expectSaved(page);
      });

      test('TC_WIKI_PUT_003: Reject an update to a nonexistent page', async ({
        wiki,
      }) => {
        await wiki.expectAbsent(wiki.missingSlug);
        const response = await wiki.update(wiki.missingSlug, {
          content: wiki.updatedContent,
        });
        expectError(response, 404);
        await wiki.expectAbsent(wiki.missingSlug);
      });

      test('TC_WIKI_PUT_004: Reject an update with an invalid token', async ({
        wiki,
      }) => {
        const page = await wiki.createPage();
        const response = await wiki.request('PUT', wiki.pageUrl(page.slug), {
          access: 'invalid',
          json: { content: wiki.updatedContent },
        });
        expectError(response, 401);
        await wiki.expectSaved(page);
      });
    });

    describe('GET', () => {
      test('TC_WIKI_GET_001: Retrieve a newly created guide', async ({
        wiki,
      }) => {
        const page = await wiki.createPage();
        wiki.expectPage(
          await wiki.request('GET', wiki.pageUrl(page.slug)),
          page,
        );
        await wiki.expectSaved(page);
      });

      test('TC_WIKI_GET_002: Include content when listing pages', async ({
        wiki,
      }) => {
        const page = await wiki.createPage();
        const entry = (await wiki.list(true)).find(
          (item) => item.slug === page.slug,
        );
        expect(entry).toMatchObject(page);
      });

      test('TC_WIKI_GET_003: Reject retrieval of a nonexistent page', async ({
        wiki,
      }) => {
        await wiki.expectAbsent(wiki.missingSlug);
        expectError(
          await wiki.request('GET', wiki.pageUrl(wiki.missingSlug)),
          404,
        );
      });

      test('TC_WIKI_GET_004: Retrieve a guide at a nested path', async ({
        wiki,
      }) => {
        const title = `manual-${wiki.title}/installation`;
        const page = wiki.createdPage(
          await wiki.create({
            title,
            content: wiki.initialContent,
            format: 'markdown',
          }),
          title,
        );
        expect(page.slug).toContain('/');
        expect(page.title).toBe('installation');
        await wiki.expectSaved(page);
      });

      test('TC_WIKI_GET_005: List a wiki without pages', async ({ wiki }) => {
        const root = wiki.emptyRoot();
        const options = {
          searchParams: { with_content: true, per_page: 100, page: 1 },
        };
        const before = await wiki.request('GET', root, options);
        expectJson(before, 200);
        expect(WikiPageContentListSchema.parse(before.body)).toEqual([]);
        const response = await wiki.request('GET', root, options);
        expectJson(response, 200);
        expect(WikiPageContentListSchema.parse(response.body)).toEqual([]);
      });
    });

    describe('DELETE', () => {
      test('TC_WIKI_DELETE_001: Delete an existing guide', async ({ wiki }) => {
        const page = await wiki.createPage();
        await wiki.deletePage(page);
        expect(
          (await wiki.list()).some((item) => item.slug === page.slug),
        ).toBe(false);
      });

      test('TC_WIKI_DELETE_002: Reject deletion of a nonexistent page', async ({
        wiki,
      }) => {
        const page = await wiki.createPage();
        await wiki.expectAbsent(wiki.missingSlug);
        expectError(
          await wiki.request('DELETE', wiki.pageUrl(wiki.missingSlug)),
          404,
        );
        await wiki.expectAbsent(wiki.missingSlug);
        await wiki.expectSaved(page);
      });

      test('TC_WIKI_DELETE_003: Reject deletion with an invalid token', async ({
        wiki,
      }) => {
        const page = await wiki.createPage();
        expectError(
          await wiki.request('DELETE', wiki.pageUrl(page.slug), {
            access: 'invalid',
          }),
          401,
        );
        await wiki.expectSaved(page);
      });
    });

    describe('E2E', () => {
      test('TC_WIKI_E2E_001: Maintain a guide throughout its lifecycle', async ({
        wiki,
      }) => {
        const page = wiki.createdPage(await wiki.create());
        await wiki.expectSaved(page);
        const updated = await wiki.request('PUT', wiki.pageUrl(page.slug), {
          json: { content: wiki.updatedContent },
        });
        wiki.expectPage(updated, page, wiki.updatedContent);
        await wiki.expectSaved(page, wiki.updatedContent);
        expect(
          (await wiki.list(true)).find((item) => item.slug === page.slug),
        ).toMatchObject({
          ...page,
          content: wiki.updatedContent,
        });
        await wiki.deletePage(page);
        expect(
          (await wiki.list()).some((item) => item.slug === page.slug),
        ).toBe(false);
      });

      test('TC_WIKI_E2E_002: Protect a guide with a read-only API token', async ({
        wiki,
      }) => {
        wiki.requireReader();
        const page = await wiki.createPage();
        wiki.expectPage(
          await wiki.request('GET', wiki.pageUrl(page.slug), {
            access: 'reader',
          }),
          page,
        );
        const updated = await wiki.request('PUT', wiki.pageUrl(page.slug), {
          access: 'reader',
          json: { content: 'Reader change' },
        });
        expectError(updated, 403);
        await wiki.expectSaved(page);
        expectError(
          await wiki.request('DELETE', wiki.pageUrl(page.slug), {
            access: 'reader',
          }),
          403,
        );
        await wiki.expectSaved(page);
      });
    });
  },
);
