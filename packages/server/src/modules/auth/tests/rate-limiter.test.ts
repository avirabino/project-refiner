// @vitest-environment node
/**
 * Unit tests for the in-memory rate limiter.
 * Tests checkRateLimit() and _resetRateLimits() exported from auth.service.ts.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { checkRateLimit, _resetRateLimits } from '../auth.service.js';

describe('checkRateLimit', () => {
  beforeEach(() => {
    _resetRateLimits();
  });

  it('allows requests within the limit', () => {
    const key = 'test:ip1';
    expect(checkRateLimit(key, 3, 60_000)).toBe(true);
    expect(checkRateLimit(key, 3, 60_000)).toBe(true);
    expect(checkRateLimit(key, 3, 60_000)).toBe(true);
  });

  it('blocks requests exceeding the limit', () => {
    const key = 'test:ip2';
    expect(checkRateLimit(key, 2, 60_000)).toBe(true);
    expect(checkRateLimit(key, 2, 60_000)).toBe(true);
    // Third request should be blocked
    expect(checkRateLimit(key, 2, 60_000)).toBe(false);
  });

  it('uses separate buckets for different keys', () => {
    expect(checkRateLimit('key:a', 1, 60_000)).toBe(true);
    expect(checkRateLimit('key:b', 1, 60_000)).toBe(true);
    // Each key has its own limit
    expect(checkRateLimit('key:a', 1, 60_000)).toBe(false);
    expect(checkRateLimit('key:b', 1, 60_000)).toBe(false);
  });

  it('allows requests after the window expires', () => {
    const key = 'test:expire';
    // Use a very short window (1ms)
    expect(checkRateLimit(key, 1, 1)).toBe(true);
    // The timestamp is already 1ms old, so next call with a fresh window check should allow
    // We need to wait just a tiny bit for the timestamp to age
    return new Promise<void>((resolve) => {
      setTimeout(() => {
        expect(checkRateLimit(key, 1, 1)).toBe(true);
        resolve();
      }, 5);
    });
  });

  it('resets all limits via _resetRateLimits', () => {
    const key = 'test:reset';
    expect(checkRateLimit(key, 1, 60_000)).toBe(true);
    expect(checkRateLimit(key, 1, 60_000)).toBe(false);

    _resetRateLimits();

    // After reset, should be allowed again
    expect(checkRateLimit(key, 1, 60_000)).toBe(true);
  });

  it('handles register rate limit scenario (5 per hour)', () => {
    const key = 'register:192.168.1.1';
    const limit = 5;
    const window = 60 * 60 * 1000; // 1 hour

    for (let i = 0; i < limit; i++) {
      expect(checkRateLimit(key, limit, window)).toBe(true);
    }
    // 6th request should be blocked
    expect(checkRateLimit(key, limit, window)).toBe(false);
  });

  it('handles resend rate limit scenario (3 per hour)', () => {
    const key = 'resend:user@example.com';
    const limit = 3;
    const window = 60 * 60 * 1000;

    for (let i = 0; i < limit; i++) {
      expect(checkRateLimit(key, limit, window)).toBe(true);
    }
    expect(checkRateLimit(key, limit, window)).toBe(false);
  });
});
