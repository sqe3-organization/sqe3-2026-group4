import type { Got, OptionsInit, Response } from 'got';
import { createGitLabClient } from './client.ts';

type RequestOptions = Omit<
  OptionsInit,
  'method' | 'responseType' | 'resolveBodyOnly' | 'isStream'
> & { client?: Got };

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

    if (responseType === 'text') {
      return client(endpoint, { ...request, responseType });
    }

    return client<T>(endpoint, { ...request, responseType });
  }
}

export const requestManager = RequestManager.getInstance();
