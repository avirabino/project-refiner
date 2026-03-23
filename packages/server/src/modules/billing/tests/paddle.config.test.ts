// @vitest-environment node
/**
 * Unit tests for paddle.config.ts — C06.
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { planFromPriceId, tokenPackFromPriceId, PLAN_TOKEN_ALLOCATIONS, _resetPriceMaps } from '../paddle.config.js';

describe('paddle.config (C06)', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    _resetPriceMaps();
  });

  afterEach(() => {
    // Restore original env
    process.env = { ...originalEnv };
    _resetPriceMaps();
  });

  describe('PLAN_TOKEN_ALLOCATIONS', () => {
    it('has correct tier allocations', () => {
      expect(PLAN_TOKEN_ALLOCATIONS.free).toBe(100);
      expect(PLAN_TOKEN_ALLOCATIONS.pro).toBe(500);
      expect(PLAN_TOKEN_ALLOCATIONS.team).toBe(2000);
      expect(PLAN_TOKEN_ALLOCATIONS.enterprise).toBe(100000);
    });
  });

  describe('planFromPriceId', () => {
    it('returns plan mapping for known price ID', () => {
      process.env.PADDLE_PRICE_PRO_MONTHLY = 'pri_pro_mo';
      _resetPriceMaps();

      const result = planFromPriceId('pri_pro_mo');
      expect(result).toEqual({
        plan: 'pro',
        tokens: 500,
        period: 'monthly',
      });
    });

    it('returns null for unknown price ID', () => {
      const result = planFromPriceId('pri_unknown');
      expect(result).toBeNull();
    });

    it('maps all subscription price IDs correctly', () => {
      process.env.PADDLE_PRICE_PRO_MONTHLY = 'pri_pm';
      process.env.PADDLE_PRICE_PRO_ANNUAL = 'pri_pa';
      process.env.PADDLE_PRICE_TEAM_MONTHLY = 'pri_tm';
      process.env.PADDLE_PRICE_TEAM_ANNUAL = 'pri_ta';
      process.env.PADDLE_PRICE_ENTERPRISE_MONTHLY = 'pri_em';
      process.env.PADDLE_PRICE_ENTERPRISE_ANNUAL = 'pri_ea';
      _resetPriceMaps();

      expect(planFromPriceId('pri_pm')).toEqual({ plan: 'pro', tokens: 500, period: 'monthly' });
      expect(planFromPriceId('pri_pa')).toEqual({ plan: 'pro', tokens: 500, period: 'yearly' });
      expect(planFromPriceId('pri_tm')).toEqual({ plan: 'team', tokens: 2000, period: 'monthly' });
      expect(planFromPriceId('pri_ta')).toEqual({ plan: 'team', tokens: 2000, period: 'yearly' });
      expect(planFromPriceId('pri_em')).toEqual({ plan: 'enterprise', tokens: 100000, period: 'monthly' });
      expect(planFromPriceId('pri_ea')).toEqual({ plan: 'enterprise', tokens: 100000, period: 'yearly' });
    });
  });

  describe('tokenPackFromPriceId', () => {
    it('returns token pack mapping for known price ID', () => {
      process.env.PADDLE_PRICE_SPARK = 'pri_spark';
      _resetPriceMaps();

      const result = tokenPackFromPriceId('pri_spark');
      expect(result).toEqual({ name: 'Spark', tokens: 200 });
    });

    it('returns null for unknown price ID', () => {
      const result = tokenPackFromPriceId('pri_nope');
      expect(result).toBeNull();
    });

    it('maps all token pack price IDs correctly', () => {
      process.env.PADDLE_PRICE_SPARK = 'pri_s';
      process.env.PADDLE_PRICE_FLOW = 'pri_f';
      process.env.PADDLE_PRICE_SURGE = 'pri_g';
      _resetPriceMaps();

      expect(tokenPackFromPriceId('pri_s')).toEqual({ name: 'Spark', tokens: 200 });
      expect(tokenPackFromPriceId('pri_f')).toEqual({ name: 'Flow', tokens: 1000 });
      expect(tokenPackFromPriceId('pri_g')).toEqual({ name: 'Surge', tokens: 5000 });
    });
  });
});
