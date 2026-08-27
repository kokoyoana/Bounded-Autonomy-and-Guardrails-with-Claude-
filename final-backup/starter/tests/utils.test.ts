import { describe, expect, it } from 'vitest';

import {
  ErrorCodes,
  ReviewError,
  withRetry,
  withTimeout
} from '../src/utils/error-handler.js';

import {
  RateLimiter
} from '../src/utils/rate-limiter.js';

describe('Error utilities', () => {
  it('withRetry should eventually succeed', async () => {
    let attempts = 0;

    const result = await withRetry(async () => {
      attempts++;

      if (attempts < 2) {
        throw new Error('fail');
      }

      return 'success';
    }, 3, 1);

    expect(result).toBe('success');
    expect(attempts).toBe(2);
  });

  it('withRetry should throw RETRY_EXHAUSTED', async () => {
    await expect(
      withRetry(
        async () => {
          throw new Error('always fails');
        },
        2,
        1
      )
    ).rejects.toMatchObject({
      code: ErrorCodes.RETRY_EXHAUSTED
    });
  });

  it('withTimeout should resolve when operation is fast', async () => {
    const result = await withTimeout(
      async () => 'done',
      100
    );

    expect(result).toBe('done');
  });

  it('withTimeout should throw AGENT_TIMEOUT', async () => {
    await expect(
      withTimeout(
        async () =>
          new Promise(resolve =>
            setTimeout(resolve, 200)
          ),
        10
      )
    ).rejects.toMatchObject({
      code: ErrorCodes.AGENT_TIMEOUT
    });
  });
});

describe('RateLimiter', () => {
  it('should allow requests below limit', () => {
    const limiter = new RateLimiter({
      maxRequestsPerMinute: 10,
      maxTokensPerMinute: 1000,
      maxConcurrent: 2
    });

    expect(limiter.canProceed(100)).toBe(true);
  });

  it('should block requests above token limit', async () => {
    const limiter = new RateLimiter({
      maxRequestsPerMinute: 10,
      maxTokensPerMinute: 100,
      maxConcurrent: 2
    });

    await limiter.acquire(100);

    expect(limiter.canProceed(1)).toBe(false);
  });
});