import { performance } from 'node:perf_hooks';
import {
  HTTPError,
  RequestError,
  type Got,
  type OptionsInit,
  type Response,
} from 'got';
import { createGitLabClient } from './client.ts';
import { logApiTransaction, logRequestFailure } from '../utils/logger.ts';

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
    const metadata = () => ({
      method,
      testCase,
      durationMs: Math.round(performance.now() - startTime),
    });
    let response: Response<T> | Response<string>;
    try {
      response =
        responseType === 'text'
          ? await client(endpoint, { ...request, responseType })
          : await client<T>(endpoint, { ...request, responseType });
    } catch (error) {
      if (error instanceof HTTPError && error.response) {
        logApiTransaction({
          ...metadata(),
          statusCode: error.response.statusCode,
        });
      } else {
        const requestError = error instanceof RequestError ? error : undefined;
        const code = requestError?.code;
        logRequestFailure({
          ...metadata(),
          statusCode: requestError?.response?.statusCode,
          errorCode:
            code && /^[A-Z][A-Z0-9_]{1,39}$/.test(code)
              ? code
              : 'REQUEST_ERROR',
        });
      }
      throw error;
    }
    logApiTransaction({ ...metadata(), statusCode: response.statusCode });
    return response;
  }
}

export const requestManager = RequestManager.getInstance();
