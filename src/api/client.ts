import got, { type Got, type OptionsInit } from 'got';

export interface GitLabClientConfig {
  baseUrl?: string;
  token?: string;
  timeoutMs?: number;
}

export function createGitLabClient(config: GitLabClientConfig = {}): Got {
  const baseUrl = config.baseUrl || process.env.GITLAB_BASE_URL || 'https://gitlab.com/api/v4';
  const token = config.token || process.env.GITLAB_TOKEN_REPORTER || '';
  const timeoutMs = config.timeoutMs || 10000;

  const headers: Record<string, string> = {
    'Accept': 'application/json',
    'User-Agent': 'SQE3-GitLab-Test-Framework/1.0 (Yeraldin-Issues-Module)'
  };

  if (token) {
    headers['PRIVATE-TOKEN'] = token;
  }

  const options: OptionsInit = {
    prefixUrl: baseUrl,
    responseType: 'json',
    throwHttpErrors: false,
    timeout: {
      request: timeoutMs
    },
    headers
  };

  return got.extend(options);
}

export const defaultClient = createGitLabClient();
