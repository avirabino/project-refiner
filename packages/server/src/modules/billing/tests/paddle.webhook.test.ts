// @vitest-environment node
/**
 * Unit tests for paddle.webhook.ts — C03.
 *
 * Tests the signature verification function directly.
 * Webhook handler integration is tested via the exported function.
 */
import { describe, it, expect } from 'vitest';
import { createHmac } from 'node:crypto';
import { _verifyPaddleSignature } from '../paddle.webhook.js';

describe('verifyPaddleSignature (C03)', () => {
  const secret = 'test-webhook-secret-123';

  function buildSignature(body: string, timestamp: string, signingSecret: string): string {
    const signedPayload = `${timestamp}:${body}`;
    const hash = createHmac('sha256', signingSecret)
      .update(signedPayload)
      .digest('hex');
    return `ts=${timestamp};h1=${hash}`;
  }

  it('accepts valid signature', () => {
    const body = '{"event_type":"subscription.created"}';
    const timestamp = '1711234567';
    const signature = buildSignature(body, timestamp, secret);

    expect(_verifyPaddleSignature(body, signature, secret)).toBe(true);
  });

  it('rejects tampered body', () => {
    const body = '{"event_type":"subscription.created"}';
    const timestamp = '1711234567';
    const signature = buildSignature(body, timestamp, secret);

    // Tamper with the body
    const tamperedBody = '{"event_type":"transaction.completed"}';
    expect(_verifyPaddleSignature(tamperedBody, signature, secret)).toBe(false);
  });

  it('rejects wrong secret', () => {
    const body = '{"event_type":"subscription.created"}';
    const timestamp = '1711234567';
    const signature = buildSignature(body, timestamp, 'wrong-secret');

    expect(_verifyPaddleSignature(body, signature, secret)).toBe(false);
  });

  it('rejects missing timestamp', () => {
    expect(_verifyPaddleSignature('{}', 'h1=abc123', secret)).toBe(false);
  });

  it('rejects missing hash', () => {
    expect(_verifyPaddleSignature('{}', 'ts=1711234567', secret)).toBe(false);
  });

  it('rejects empty signature header', () => {
    expect(_verifyPaddleSignature('{}', '', secret)).toBe(false);
  });

  it('rejects malformed signature header', () => {
    expect(_verifyPaddleSignature('{}', 'not-a-valid-signature', secret)).toBe(false);
  });
});
