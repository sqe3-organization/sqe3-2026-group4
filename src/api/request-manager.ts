import { performance } from 'node:perf_hooks';
import type { Got, OptionsInit, Response } from 'got';
import { createGitLabClient } from './client.ts';
import { logApiTransaction } from '../utils/logger.ts';

type RequestOptions = Omit<
  OptionsInit,
  'method' | 'responseType' | 'resolveBodyOnly' | 'isStream'
> & { client?: Got; testCase?: string };

export class RequestManager {
  private static instance: RequestManager | undefined;

  private constructor() {}

  static getInstance(): RequestManager {
    return (RequestManager.instance ??= new RequestManager());
  }

  request(
    method: NonNullable<OptionsInit['method']>,
    endpoint: string,
    options: RequestOptions & { responseType: 'text' },
  ): Promise<Response<string>>;

  request<T = unknown>(
    method: NonNullable<OptionsInit['method']>,
    endpoint: string,
    options?: RequestOptions & { responseType?: 'json' },
  ): Promise<Response<T>>;

  async request<T = unknown>(
    method: NonNullable<OptionsInit['method']>,
    endpoint: string,
    {
      client = createGitLabClient(),
      responseType = 'json',
      testCase,
      ...options
    }: RequestOptions & {
      responseType?: 'json' | 'text';
    } = {},
  ): Promise<Response<T> | Response<string>> {
    const request = {
      ...options,
      method,
      resolveBodyOnly: false as const,
      isStream: false as const,
    };

    const startTime = performance.now();
    try {
      let response: Response<T> | Response<string>;
      if (responseType === 'text') {
        response = await client(endpoint, { ...request, responseType });
      } else {
        response = await client<T>(endpoint, { ...request, responseType });
      }

      const durationMs = Math.round(performance.now() - startTime);
      logApiTransaction({
        method,
        url: endpoint,
        statusCode: response.statusCode,
        durationMs,
        testCase,
      });

      return response;
    } catch (err: unknown) {
      const durationMs = Math.round(performance.now() - startTime);
      const errMsg = err instanceof Error ? err.message : String(err);
      logApiTransaction({
        method,
        url: endpoint,
        statusCode: 500,
        durationMs,
        testCase,
        error: errMsg,
      });
      throw err;
    }
  }
}

export const requestManager = RequestManager.getInstance();
