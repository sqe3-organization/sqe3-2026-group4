import got, { type Got } from 'got';

const DEFAULT_BASE_URL = 'https://gitlab.com/api/v4';
const DEFAULT_TIMEOUT_MS = 10_000;
const DEFAULT_USER_AGENT = 'SQE3-GitLab-Test-Framework/1.0';

export interface GitLabClientConfig {
  baseUrl?: string;
  token?: string;
  timeoutMs?: number;
  userAgent?: string;
}

function resolveToken(token?: string): string {
  return (
    token ??
    process.env.GITLAB_TOKEN_EDITOR ??
    process.env.GITLAB_TOKEN ??
    process.env.GLAB_TOKEN ??
    process.env.GITLAB_TOKEN_REPORTER ??
    ''
  );
}

function resolveRetryLimit(): number {
  const limit = Number(process.env.GITLAB_RETRY_LIMIT ?? 0);

  if (!Number.isSafeInteger(limit) || limit < 0) {
    throw new Error('GITLAB_RETRY_LIMIT must be a non-negative integer.');
  }

  return limit;
}

function createHeaders(
  token: string,
  userAgent: string,
): Record<string, string> {
  const headers: Record<string, string> = {
    Accept: 'application/json',
    'User-Agent': userAgent,
  };

  if (token) {
    headers['PRIVATE-TOKEN'] = token;
  }

  return headers;
}

export function createGitLabClient(config: GitLabClientConfig = {}): Got {
  return got.extend({
    prefixUrl:
      config.baseUrl || process.env.GITLAB_BASE_URL || DEFAULT_BASE_URL,
    responseType: 'json',
    throwHttpErrors: false,
    timeout: {
      request: config.timeoutMs ?? DEFAULT_TIMEOUT_MS,
    },
    retry: { limit: resolveRetryLimit() },
    headers: createHeaders(
      resolveToken(config.token),
      config.userAgent ?? DEFAULT_USER_AGENT,
    ),
  });
}

export const defaultClient = createGitLabClient();
