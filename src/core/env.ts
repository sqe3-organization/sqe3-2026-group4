export const DEFAULT_BASE_URL = 'https://gitlab.com/api/v4';
export const DEFAULT_TIMEOUT_MS = 10_000;
export const DEFAULT_USER_AGENT = 'SQE3-GitLab-Test-Framework/1.0';

export interface GitLabClientConfig {
  baseUrl?: string;
  token?: string;
  timeoutMs?: number;
  userAgent?: string;
}

export function resolveGitLabToken(token?: string): string {
  return (
    token ??
    process.env.GITLAB_TOKEN_EDITOR ??
    process.env.GITLAB_TOKEN ??
    process.env.GLAB_TOKEN ??
    process.env.GITLAB_TOKEN_REPORTER ??
    ''
  );
}

export function resolveGitLabRetryLimit(): number {
  const limit = Number(process.env.GITLAB_RETRY_LIMIT ?? 0);

  if (!Number.isSafeInteger(limit) || limit < 0) {
    throw new Error('GITLAB_RETRY_LIMIT must be a non-negative integer.');
  }

  return limit;
}
