// @vitest-environment node
/**
 * Unit tests for billing.service.ts — C04 (balance, portal) + C05 (promo codes).
 *
 * Mocks the Neon database pool to test service logic without a real DB.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// ============================================================================
// Mock the database client
// ============================================================================

const mockQuery = vi.fn();
const mockPool = { query: mockQuery };

vi.mock('../../../db/client.js', () => ({
  getPool: () => mockPool,
}));

// Import AFTER mocks
import { getBalance, getSubscriptionPortal, redeemPromoCode, BillingError } from '../billing.service.js';

describe('getBalance (C04)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns balance from DB', async () => {
    const renewedAt = new Date('2026-03-01T00:00:00Z');
    mockQuery.mockResolvedValueOnce({
      rowCount: 1,
      rows: [{
        plan: 'pro',
        plan_tokens: 450,
        purchased_tokens: 200,
        total_tokens_used: 50,
        tokens_renewed_at: renewedAt,
      }],
    });

    const balance = await getBalance('user-123');

    expect(balance.plan).toBe('pro');
    expect(balance.planTokens).toBe(450);
    expect(balance.purchasedTokens).toBe(200);
    expect(balance.totalUsed).toBe(50);
    expect(balance.renewsAt).toBe('2026-04-01T00:00:00.000Z'); // next month
  });

  it('throws USER_NOT_FOUND for nonexistent user', async () => {
    mockQuery.mockResolvedValueOnce({ rowCount: 0, rows: [] });

    try {
      await getBalance('ghost');
      expect.fail('Should have thrown');
    } catch (err) {
      expect(err).toBeInstanceOf(BillingError);
      expect((err as BillingError).code).toBe('USER_NOT_FOUND');
      expect((err as BillingError).statusCode).toBe(404);
    }
  });
});

describe('getSubscriptionPortal (C04)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns portal URL for subscribed user', async () => {
    mockQuery.mockResolvedValueOnce({
      rowCount: 1,
      rows: [{ paddle_customer_id: 'ctm_abc123' }],
    });

    const portal = await getSubscriptionPortal('user-123');
    expect(portal.url).toContain('ctm_abc123');
    expect(portal.url).toContain('sandbox-'); // Default is sandbox
  });

  it('throws NO_SUBSCRIPTION when user has no paddle_customer_id', async () => {
    mockQuery.mockResolvedValueOnce({
      rowCount: 1,
      rows: [{ paddle_customer_id: null }],
    });

    try {
      await getSubscriptionPortal('user-123');
      expect.fail('Should have thrown');
    } catch (err) {
      expect(err).toBeInstanceOf(BillingError);
      expect((err as BillingError).code).toBe('NO_SUBSCRIPTION');
      expect((err as BillingError).statusCode).toBe(400);
    }
  });

  it('throws USER_NOT_FOUND for nonexistent user', async () => {
    mockQuery.mockResolvedValueOnce({ rowCount: 0, rows: [] });

    try {
      await getSubscriptionPortal('ghost');
      expect.fail('Should have thrown');
    } catch (err) {
      expect(err).toBeInstanceOf(BillingError);
      expect((err as BillingError).code).toBe('USER_NOT_FOUND');
    }
  });
});

describe('redeemPromoCode (C05)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('redeems valid promo code and adds to purchased_tokens', async () => {
    mockQuery
      // 1. Find promo code
      .mockResolvedValueOnce({
        rowCount: 1,
        rows: [{
          id: 'promo-uuid',
          code: 'VIGIL-LAUNCH-100',
          token_amount: 100,
          max_uses: 500,
          used_count: 10,
          expires_at: new Date('2027-01-01'),
        }],
      })
      // 2. Check if already redeemed
      .mockResolvedValueOnce({ rowCount: 0, rows: [] })
      // 3. UPDATE purchased_tokens
      .mockResolvedValueOnce({ rowCount: 1, rows: [] })
      // 4. INSERT promo_code_redemptions
      .mockResolvedValueOnce({ rowCount: 1, rows: [] })
      // 5. UPDATE promo_codes used_count
      .mockResolvedValueOnce({ rowCount: 1, rows: [] })
      // 6. Get updated balance
      .mockResolvedValueOnce({
        rowCount: 1,
        rows: [{ plan_tokens: 100, purchased_tokens: 100 }],
      })
      // 7. INSERT token_transactions
      .mockResolvedValueOnce({ rowCount: 1, rows: [] });

    const result = await redeemPromoCode('user-123', 'VIGIL-LAUNCH-100');

    expect(result.tokensAdded).toBe(100);
    expect(result.newPurchasedBalance).toBe(100);

    // Verify purchased_tokens update
    const updateCall = mockQuery.mock.calls[2];
    expect(updateCall[0]).toContain('purchased_tokens = purchased_tokens + $1');
    expect(updateCall[1]).toEqual([100, 'user-123']);
  });

  it('rejects invalid promo code', async () => {
    mockQuery.mockResolvedValueOnce({ rowCount: 0, rows: [] });

    try {
      await redeemPromoCode('user-123', 'INVALID');
      expect.fail('Should have thrown');
    } catch (err) {
      expect(err).toBeInstanceOf(BillingError);
      expect((err as BillingError).code).toBe('INVALID_PROMO');
    }
  });

  it('rejects expired promo code', async () => {
    mockQuery.mockResolvedValueOnce({
      rowCount: 1,
      rows: [{
        id: 'promo-uuid',
        code: 'EXPIRED',
        token_amount: 50,
        max_uses: 100,
        used_count: 5,
        expires_at: new Date('2020-01-01'), // expired
      }],
    });

    try {
      await redeemPromoCode('user-123', 'EXPIRED');
      expect.fail('Should have thrown');
    } catch (err) {
      expect(err).toBeInstanceOf(BillingError);
      expect((err as BillingError).code).toBe('PROMO_EXPIRED');
    }
  });

  it('rejects exhausted promo code', async () => {
    mockQuery.mockResolvedValueOnce({
      rowCount: 1,
      rows: [{
        id: 'promo-uuid',
        code: 'FULL',
        token_amount: 50,
        max_uses: 10,
        used_count: 10, // maxed out
        expires_at: null,
      }],
    });

    try {
      await redeemPromoCode('user-123', 'FULL');
      expect.fail('Should have thrown');
    } catch (err) {
      expect(err).toBeInstanceOf(BillingError);
      expect((err as BillingError).code).toBe('PROMO_EXHAUSTED');
    }
  });

  it('rejects already-redeemed promo code', async () => {
    mockQuery
      .mockResolvedValueOnce({
        rowCount: 1,
        rows: [{
          id: 'promo-uuid',
          code: 'REDEEMED',
          token_amount: 50,
          max_uses: 100,
          used_count: 5,
          expires_at: null,
        }],
      })
      .mockResolvedValueOnce({
        rowCount: 1, // Already redeemed!
        rows: [{ id: 'redemption-uuid' }],
      });

    try {
      await redeemPromoCode('user-123', 'REDEEMED');
      expect.fail('Should have thrown');
    } catch (err) {
      expect(err).toBeInstanceOf(BillingError);
      expect((err as BillingError).code).toBe('PROMO_ALREADY_REDEEMED');
    }
  });

  it('allows promo with unlimited uses (max_uses = null)', async () => {
    mockQuery
      .mockResolvedValueOnce({
        rowCount: 1,
        rows: [{
          id: 'promo-uuid',
          code: 'UNLIMITED',
          token_amount: 500,
          max_uses: null, // unlimited
          used_count: 9999,
          expires_at: null,
        }],
      })
      .mockResolvedValueOnce({ rowCount: 0, rows: [] }) // not redeemed
      .mockResolvedValueOnce({ rowCount: 1, rows: [] }) // UPDATE purchased_tokens
      .mockResolvedValueOnce({ rowCount: 1, rows: [] }) // INSERT redemption
      .mockResolvedValueOnce({ rowCount: 1, rows: [] }) // UPDATE used_count
      .mockResolvedValueOnce({
        rowCount: 1,
        rows: [{ plan_tokens: 100, purchased_tokens: 500 }],
      })
      .mockResolvedValueOnce({ rowCount: 1, rows: [] }); // INSERT transaction

    const result = await redeemPromoCode('user-123', 'UNLIMITED');
    expect(result.tokensAdded).toBe(500);
  });
});
