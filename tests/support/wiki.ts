import { randomUUID } from 'node:crypto';
import type { Got, OptionsInit, Response } from 'got';
import { expect, test as base } from 'vitest';
import { createGitLabClient } from '@/core/client.ts';
import { requestManager } from '@/core/request-manager.ts';
import { wikiEndpoints } from '@/domains/wiki/wiki.endpoints.ts';
import {
  WikiErrorSchema,
  WikiPageContentListSchema,
  WikiPageListSchema,
  WikiPageSchema,
  type WikiPage,
  type WikiPageSummary,
} from '@/domains/wiki/wiki.schema.ts';

function required(value: string | undefined, name: string): string {
  if (!value?.trim())
    throw new Error(
      `Configure ${name} in .env before running Wiki integration tests.`,
    );

  return value.trim();
}

function projectId(value: string | undefined, name: string): string {
  const id = required(value, name);

  if (!/^\d+$/.test(id))
    throw new Error(`${name} must be a numeric project ID.`);

  return id;
}

export function expectJson(response: Response<unknown>, status: number): void {
  expect(response.statusCode).toBe(status);
  expect(response.headers['content-type']).toContain('application/json');
}

export function expectError(response: Response<unknown>, status: number): void {
  expectJson(response, status);
  WikiErrorSchema.parse(response.body);
  expect(response.body).not.toHaveProperty('slug');
}

type WikiAccess = 'editor' | 'invalid' | 'reader';
type WikiMethod = 'GET' | 'PUT' | 'POST' | 'DELETE';
type WikiRequestOptions = Pick<OptionsInit, 'json' | 'searchParams'> & {
  access?: WikiAccess;
};
type WikiTextOptions = WikiRequestOptions & { responseType: 'text' };
type WikiJsonOptions = WikiRequestOptions & { responseType?: 'json' };

class WikiSession {
  private readonly caseId: string;
  private readonly editor: Got;
  private readonly root: string;
  private readonly project: string;
  private readonly editorToken: string;
  private readonly runId = randomUUID();
  readonly initialContent = 'Initial guide';
  readonly updatedContent = 'Updated guide';
  private readonly ownedSlugs = new Set<string>();

  constructor(caseId: string) {
    this.caseId = caseId;
    this.project = projectId(
      process.env.GITLAB_WIKI_PROJECT_ID ?? process.env.GITLAB_PROJECT_ID,
      'GITLAB_WIKI_PROJECT_ID',
    );
    this.editorToken = required(
      process.env.GITLAB_TOKEN_EDITOR ??
        process.env.GITLAB_TOKEN ??
        process.env.GLAB_TOKEN,
      'GITLAB_TOKEN_EDITOR',
    );
    this.editor = this.client(this.editorToken);
    this.root = wikiEndpoints.pages(this.project);
  }

  get title(): string {
    return `sqe3-code-${this.caseId.toLowerCase()}-${this.runId}`;
  }

  get missingSlug(): string {
    return `absent-${this.runId}`;
  }

  private client(token: string): Got {
    return createGitLabClient({
      token,
      userAgent: 'SQE3-GitLab-Test-Framework/1.0 (Matthew-Wiki-Module)',
    }).extend({ followRedirect: false });
  }

  private requireReaderToken(): string {
    const token = required(
      process.env.GITLAB_TOKEN_READER,
      'GITLAB_TOKEN_READER',
    );

    if (token === this.editorToken)
      throw new Error(
        'GITLAB_TOKEN_READER must be a separate read_api-only token.',
      );

    return token;
  }

  requireReader(): void {
    this.requireReaderToken();
  }

  request(
    method: WikiMethod,
    endpoint: string,
    options: WikiTextOptions,
  ): Promise<Response<string>>;
  request(
    method: WikiMethod,
    endpoint: string,
    options?: WikiJsonOptions,
  ): Promise<Response<unknown>>;
  request(
    method: WikiMethod,
    endpoint: string,
    options: WikiJsonOptions | WikiTextOptions = {},
  ): Promise<Response<unknown>> {
    const {
      access = 'editor',
      responseType = 'json',
      ...requestOptions
    } = options;
    const client =
      access === 'editor'
        ? this.editor
        : this.client(
            access === 'reader'
              ? this.requireReaderToken()
              : 'invalid-token-sqe3',
          );

    if (responseType === 'text') {
      return requestManager.request(method, endpoint, {
        ...requestOptions,
        client,
        testCase: this.caseId,
        responseType,
      });
    }

    return requestManager.request(method, endpoint, {
      ...requestOptions,
      client,
      testCase: this.caseId,
      responseType,
    });
  }

  emptyRoot(): string {
    const emptyProject = projectId(
      process.env.GITLAB_WIKI_EMPTY_PROJECT_ID,
      'GITLAB_WIKI_EMPTY_PROJECT_ID',
    );

    if (emptyProject === this.project)
      throw new Error(
        'The empty-wiki project must differ from the writable Wiki project.',
      );

    return wikiEndpoints.pages(emptyProject);
  }

  pageUrl(slug: string): string {
    return wikiEndpoints.page(this.project, slug);
  }

  expectPage(
    response: Response<unknown>,
    page: WikiPage,
    content = this.initialContent,
    status = 200,
  ): WikiPage {
    expectJson(response, status);
    const actual = WikiPageSchema.parse(response.body);
    expect(actual).toMatchObject({
      title: page.title,
      slug: page.slug,
      format: 'markdown',
      content,
    });

    return actual;
  }

  async create(
    body: Record<string, unknown> = {
      title: this.title,
      content: this.initialContent,
      format: 'markdown',
    },
    access: WikiAccess = 'editor',
  ): Promise<Response<unknown>> {
    const submittedTitle =
      typeof body.title === 'string' ? body.title : undefined;

    if (submittedTitle)
      await this.expectAbsent(submittedTitle.replace(/ /g, '-'));

    const response = await this.request('POST', this.root, {
      access,
      json: body,
    });

    if (response.statusCode === 201) {
      const candidate = response.body as { slug?: unknown };

      if (typeof candidate.slug === 'string' && candidate.slug)
        this.ownedSlugs.add(candidate.slug);
    }

    return response;
  }

  async createPage(title = this.title): Promise<WikiPage> {
    const response = await this.create({
      title,
      content: this.initialContent,
      format: 'markdown',
    });

    return this.createdPage(response, title);
  }

  createdPage(
    response: Response<unknown>,
    title = this.title,
    content = this.initialContent,
  ): WikiPage {
    expectJson(response, 201);
    const page = WikiPageSchema.parse(response.body);
    expect(page).toMatchObject({
      title: title.split('/').pop()?.replace(/-/g, ' '),
      content,
      format: 'markdown',
    });
    expect(page.slug).toBe(title.replace(/ /g, '-'));

    return page;
  }

  async expectSaved(
    page: WikiPage,
    content = this.initialContent,
  ): Promise<void> {
    this.expectPage(
      await this.request('GET', this.pageUrl(page.slug)),
      page,
      content,
    );
  }

  async update(
    slug: string,
    json: Record<string, unknown>,
  ): Promise<Response<unknown>> {
    const response = await this.request('PUT', this.pageUrl(slug), { json });

    if (response.statusCode >= 200 && response.statusCode < 300) {
      const candidate = response.body as { slug?: unknown };
      if (candidate.slug === slug) this.ownedSlugs.add(slug);
    }

    return response;
  }

  async expectAbsent(slug: string): Promise<void> {
    expectError(await this.request('GET', this.pageUrl(slug)), 404);
  }

  async list(withContent: true): Promise<WikiPage[]>;
  async list(withContent?: false): Promise<WikiPageSummary[]>;
  async list(withContent = false): Promise<WikiPageSummary[]> {
    const rows: WikiPageSummary[] = [];
    const visited = new Set<string>();
    let next = '1';
    while (next) {
      if (visited.has(next) || visited.size >= 1000)
        throw new Error('Wiki pagination did not terminate.');
      visited.add(next);
      const response = await this.request('GET', this.root, {
        searchParams: { per_page: 100, page: next, with_content: withContent },
      });
      expectJson(response, 200);
      const pages = withContent
        ? WikiPageContentListSchema.parse(response.body)
        : WikiPageListSchema.parse(response.body);
      rows.push(...pages);
      const header = response.headers['x-next-page'];
      next =
        header === undefined
          ? pages.length === 100
            ? String(Number(next) + 1)
            : ''
          : String(header).trim();
    }
    expect(new Set(rows.map((page) => page.slug)).size).toBe(rows.length);

    return rows;
  }

  async deletePage(page: WikiPage): Promise<void> {
    const response = await this.request('DELETE', this.pageUrl(page.slug), {
      responseType: 'text',
    });
    expect(response.statusCode).toBe(204);
    expect(response.body).toBe('');
    await this.expectAbsent(page.slug);
    this.ownedSlugs.delete(page.slug);
  }

  async cleanup(): Promise<void> {
    const failures: Error[] = [];
    for (const slug of this.ownedSlugs) {
      try {
        const response = await this.request('DELETE', this.pageUrl(slug), {
          responseType: 'text',
        });

        if (![204, 404].includes(response.statusCode)) {
          throw new Error(
            `Wiki cleanup failed: slug=${slug}, HTTP ${response.statusCode}, response=${response.body.slice(0, 1500)}`,
          );
        }

        if (response.statusCode === 204) expect(response.body).toBe('');
        await this.expectAbsent(slug);
        this.ownedSlugs.delete(slug);
      } catch (error) {
        failures.push(
          new Error(`Could not clean up Wiki page ${slug}`, { cause: error }),
        );
      }
    }
    if (failures.length)
      throw new AggregateError(
        failures,
        'Wiki cleanup failed; inspect the listed slugs before rerunning.',
      );
  }
}

export const test = base.extend<{ wiki: WikiSession }>({
  wiki: async ({ task }, use) => {
    const caseId = task.name.match(/TC_WIKI_[A-Z0-9]+_\d{3}/)?.[0] ?? 'wiki';
    const wiki = new WikiSession(caseId);
    try {
      await use(wiki);
    } finally {
      await wiki.cleanup();
    }
  },
});
