// @vitest-environment node
/**
 * Unit tests for billing.schemas.ts — Zod validation.
 */
import { describe, it, expect } from 'vitest';
import { redeemPromoSchema } from '../billing.schemas.js';

describe('redeemPromoSchema', () => {
  it('accepts valid promo code', () => {
    const result = redeemPromoSchema.parse({ code: 'VIGIL-LAUNCH-100' });
    expect(result.code).toBe('VIGIL-LAUNCH-100'); // uppercased + trimmed
  });

  it('transforms to uppercase and trims', () => {
    const result = redeemPromoSchema.parse({ code: '  beta-tester  ' });
    expect(result.code).toBe('BETA-TESTER');
  });

  it('rejects empty code', () => {
    expect(() => redeemPromoSchema.parse({ code: '' })).toThrow();
  });

  it('rejects missing code', () => {
    expect(() => redeemPromoSchema.parse({})).toThrow();
  });

  it('rejects code over 50 chars', () => {
    expect(() => redeemPromoSchema.parse({ code: 'A'.repeat(51) })).toThrow();
  });

  it('accepts code at max length (50 chars)', () => {
    const result = redeemPromoSchema.parse({ code: 'A'.repeat(50) });
    expect(result.code).toHaveLength(50);
  });
});
