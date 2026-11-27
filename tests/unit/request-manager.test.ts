import { HTTPError, Options, RequestError, type Got, type Response } from 'got';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { RequestManager, requestManager } from '@/core/request-manager.ts';
import { logApiTransaction, logRequestFailure } from '@/core/logger.ts';

vi.mock('@/core/logger.ts', () => ({
  logApiTransaction: vi.fn(),
  logRequestFailure: vi.fn(),
}));

describe('RequestManager', () => {
  const request = vi.fn();
  const client = request as unknown as Got;

  beforeEach(() => {
    request.mockReset();
    vi.clearAllMocks();
  });

  it('exposes the same shared instance', () => {
    expect(RequestManager.getInstance()).toBe(requestManager);
  });

  it('passes request options to the client and returns the full JSON response', async () => {
    const endpoint = 'projects/10/wikis';
    const response = {
      statusCode: 201,
      headers: { 'content-type': 'application/json' },
      body: { slug: 'unit-guide' },
    };
    const json = { title: 'Unit guide', content: 'Example' };
    const headers = { 'PRIVATE-TOKEN': 'unit-placeholder' };
    request.mockResolvedValueOnce(response);

    await expect(
      requestManager.request('POST', endpoint, {
        client,
        headers,
        json,
        testCase: 'CREATE',
      }),
    ).resolves.toBe(response);
    expect(request).toHaveBeenCalledExactlyOnceWith(endpoint, {
      method: 'POST',
      headers,
      json,
      responseType: 'json',
      resolveBodyOnly: false,
      isStream: false,
    });
    expect(logApiTransaction).toHaveBeenCalledExactlyOnceWith({
      method: 'POST',
      statusCode: 201,
      testCase: 'CREATE',
      durationMs: expect.any(Number),
    });
  });

  it('keeps an empty DELETE response in text mode', async () => {
    const response = { statusCode: 204, body: '' };
    request.mockResolvedValueOnce(response);

    await expect(
      requestManager.request('DELETE', 'unit-guide', {
        client,
        responseType: 'text',
      }),
    ).resolves.toBe(response);
    expect(request).toHaveBeenCalledExactlyOnceWith('unit-guide', {
      method: 'DELETE',
      responseType: 'text',
      resolveBodyOnly: false,
      isStream: false,
    });
  });

  it('rethrows a transport failure and records its code without a fake HTTP status', async () => {
    const cause = Object.assign(new Error('Connection reset'), {
      code: 'ECONNRESET',
    });
    const error = new RequestError('Request failed', cause, new Options());
    request.mockRejectedValueOnce(error);

    await expect(
      requestManager.request('GET', 'unit-guide', { client, testCase: 'READ' }),
    ).rejects.toBe(error);
    expect(logApiTransaction).not.toHaveBeenCalled();
    expect(logRequestFailure).toHaveBeenCalledExactlyOnceWith({
      method: 'GET',
      statusCode: undefined,
      errorCode: 'ECONNRESET',
      testCase: 'READ',
      durationMs: expect.any(Number),
    });
  });

  it('records a rejected HTTP response with the status returned by the server', async () => {
    const response = {
      statusCode: 429,
      statusMessage: 'Too Many Requests',
      request: {
        _onResponse: undefined,
        options: new Options('https://example.invalid/unit-guide'),
      },
    } as unknown as Response;
    const error = new HTTPError(response);
    request.mockRejectedValueOnce(error);

    await expect(
      requestManager.request('GET', 'unit-guide', { client }),
    ).rejects.toBe(error);
    expect(logApiTransaction).toHaveBeenCalledExactlyOnceWith({
      method: 'GET',
      statusCode: 429,
      testCase: undefined,
      durationMs: expect.any(Number),
    });
    expect(logRequestFailure).not.toHaveBeenCalled();
  });
});
