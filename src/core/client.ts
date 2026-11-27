import got, { type Got } from 'got';

import {
  DEFAULT_BASE_URL,
  DEFAULT_TIMEOUT_MS,
  DEFAULT_USER_AGENT,
  resolveGitLabRetryLimit,
  resolveGitLabToken,
  type GitLabClientConfig,
} from './env.ts';

export type { GitLabClientConfig } from './env.ts';

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
    retry: { limit: resolveGitLabRetryLimit() },
    headers: createHeaders(
      resolveGitLabToken(config.token),
      config.userAgent ?? DEFAULT_USER_AGENT,
    ),
  });
}
