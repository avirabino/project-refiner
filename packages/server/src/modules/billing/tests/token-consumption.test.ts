// @vitest-environment node
/**
 * Unit tests for token-consumption.ts — C02.
 *
 * Mocks the Neon database pool to test consumption logic without a real DB.
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

// ============================================================================
// Mock paddle.config.ts for consistent tier allocations
// ============================================================================

vi.mock('../paddle.config.js', () => ({
  PLAN_TOKEN_ALLOCATIONS: {
    free: 100,
    pro: 500,
    team: 2000,
    enterprise: 100000,
  },
}));

// Import AFTER mocks are set up
import { consumeToken, maybeRenewPlanTokens } from '../token-consumption.js';

describe('consumeToken (C02)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('deducts from plan_tokens first', async () => {
    // Setup: user with 80 plan + 50 purchased, consuming 5
    mockQuery
      // 1. Get current balances
      .mockResolvedValueOnce({
        rowCount: 1,
        rows: [{
          plan: 'free',
          plan_tokens: 80,
          purchased_tokens: 50,
          total_tokens_used: 20,
          tokens_renewed_at: new Date(), // same month — no renewal
        }],
      })
      // 2. maybeRenewPlanTokens: read state
      .mockResolvedValueOnce({
        rowCount: 1,
        rows: [{
          plan: 'free',
          plan_tokens: 80,
          tokens_renewed_at: new Date(), // same month
        }],
      })
      // 3. Re-read after renewal check
      .mockResolvedValueOnce({
        rowCount: 1,
        rows: [{
          plan_tokens: 80,
          purchased_tokens: 50,
          total_tokens_used: 20,
        }],
      })
      // 4. UPDATE users SET plan_tokens, purchased_tokens, total_tokens_used
      .mockResolvedValueOnce({ rowCount: 1, rows: [] })
      // 5. INSERT token_transactions
      .mockResolvedValueOnce({ rowCount: 1, rows: [] });

    const result = await consumeToken('user-123', 5, 'session_capture');

    expect(result.success).toBe(true);
    expect(result.remaining?.plan).toBe(75);       // 80 - 5
    expect(result.remaining?.purchased).toBe(50);   // unchanged
    expect(result.thresholdReached).toBe(false);

    // Verify UPDATE query deducted from plan only
    const updateCall = mockQuery.mock.calls[3];
    expect(updateCall[1]).toEqual([75, 50, 25, 'user-123']); // newPlan, newPurchased, newTotalUsed, userId
  });

  it('deducts across plan + purchased when plan insufficient', async () => {
    // Setup: user with 3 plan + 50 purchased, consuming 10
    mockQuery
      .mockResolvedValueOnce({
        rowCount: 1,
        rows: [{
          plan: 'free',
          plan_tokens: 3,
          purchased_tokens: 50,
          total_tokens_used: 97,
          tokens_renewed_at: new Date(),
        }],
      })
      .mockResolvedValueOnce({
        rowCount: 1,
        rows: [{
          plan: 'free',
          plan_tokens: 3,
          tokens_renewed_at: new Date(),
        }],
      })
      .mockResolvedValueOnce({
        rowCount: 1,
        rows: [{
          plan_tokens: 3,
          purchased_tokens: 50,
          total_tokens_used: 97,
        }],
      })
      .mockResolvedValueOnce({ rowCount: 1, rows: [] })
      .mockResolvedValueOnce({ rowCount: 1, rows: [] });

    const result = await consumeToken('user-123', 10, 'vigil_agent_fix');

    expect(result.success).toBe(true);
    expect(result.remaining?.plan).toBe(0);         // 3 - 3 = 0
    expect(result.remaining?.purchased).toBe(43);    // 50 - 7 = 43
    expect(result.thresholdReached).toBe(true);      // 100% plan consumed > 85%

    // Verify UPDATE query
    const updateCall = mockQuery.mock.calls[3];
    expect(updateCall[1]).toEqual([0, 43, 107, 'user-123']);
  });

  it('returns insufficient_balance when not enough tokens', async () => {
    mockQuery
      .mockResolvedValueOnce({
        rowCount: 1,
        rows: [{
          plan: 'free',
          plan_tokens: 2,
          purchased_tokens: 1,
          total_tokens_used: 97,
          tokens_renewed_at: new Date(),
        }],
      })
      .mockResolvedValueOnce({
        rowCount: 1,
        rows: [{
          plan: 'free',
          plan_tokens: 2,
          tokens_renewed_at: new Date(),
        }],
      })
      .mockResolvedValueOnce({
        rowCount: 1,
        rows: [{
          plan_tokens: 2,
          purchased_tokens: 1,
          total_tokens_used: 97,
        }],
      });

    const result = await consumeToken('user-123', 10, 'session_capture');

    expect(result.success).toBe(false);
    expect(result.reason).toBe('insufficient_balance');
    expect(result.remaining?.plan).toBe(2);
    expect(result.remaining?.purchased).toBe(1);
  });

  it('returns user_not_found for nonexistent user', async () => {
    mockQuery.mockResolvedValueOnce({ rowCount: 0, rows: [] });

    const result = await consumeToken('ghost-user', 5, 'test');
    expect(result.success).toBe(false);
    expect(result.reason).toBe('user_not_found');
  });

  it('triggers threshold warning at 85% plan consumption', async () => {
    // Setup: free plan (100 tokens), 14 remaining after consume → 86% used
    mockQuery
      .mockResolvedValueOnce({
        rowCount: 1,
        rows: [{
          plan: 'free',
          plan_tokens: 15,
          purchased_tokens: 100,
          total_tokens_used: 85,
          tokens_renewed_at: new Date(),
        }],
      })
      .mockResolvedValueOnce({
        rowCount: 1,
        rows: [{
          plan: 'free',
          plan_tokens: 15,
          tokens_renewed_at: new Date(),
        }],
      })
      .mockResolvedValueOnce({
        rowCount: 1,
        rows: [{
          plan_tokens: 15,
          purchased_tokens: 100,
          total_tokens_used: 85,
        }],
      })
      .mockResolvedValueOnce({ rowCount: 1, rows: [] })
      .mockResolvedValueOnce({ rowCount: 1, rows: [] });

    const result = await consumeToken('user-123', 1, 'test');
    expect(result.success).toBe(true);
    expect(result.remaining?.plan).toBe(14);       // 15 - 1 = 14
    expect(result.thresholdReached).toBe(true);    // 86% used > 85%
  });

  it('logs transaction with metadata', async () => {
    mockQuery
      .mockResolvedValueOnce({
        rowCount: 1,
        rows: [{
          plan: 'pro',
          plan_tokens: 400,
          purchased_tokens: 0,
          total_tokens_used: 100,
          tokens_renewed_at: new Date(),
        }],
      })
      .mockResolvedValueOnce({
        rowCount: 1,
        rows: [{
          plan: 'pro',
          plan_tokens: 400,
          tokens_renewed_at: new Date(),
        }],
      })
      .mockResolvedValueOnce({
        rowCount: 1,
        rows: [{
          plan_tokens: 400,
          purchased_tokens: 0,
          total_tokens_used: 100,
        }],
      })
      .mockResolvedValueOnce({ rowCount: 1, rows: [] })
      .mockResolvedValueOnce({ rowCount: 1, rows: [] });

    await consumeToken('user-123', 5, 'bug_autocomplete', { sessionId: 'sess-abc' });

    // Verify transaction log
    const logCall = mockQuery.mock.calls[4];
    expect(logCall[0]).toContain('INSERT INTO token_transactions');
    expect(logCall[1][0]).toBe('user-123');         // user_id
    expect(logCall[1][1]).toBe('bug_autocomplete'); // action_type
    expect(logCall[1][2]).toBe(-5);                 // amount (negative = debit)
    expect(logCall[1][3]).toBe(395);                // balance after (400 - 5 + 0)
    expect(logCall[1][4]).toBe(JSON.stringify({ sessionId: 'sess-abc' }));
  });
});

describe('maybeRenewPlanTokens (C02)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renews tokens when month boundary is crossed', async () => {
    const lastMonth = new Date();
    lastMonth.setUTCMonth(lastMonth.getUTCMonth() - 1);

    mockQuery
      // Read current state
      .mockResolvedValueOnce({
        rowCount: 1,
        rows: [{
          plan: 'pro',
          plan_tokens: 10,
          tokens_renewed_at: lastMonth,
        }],
      })
      // UPDATE users
      .mockResolvedValueOnce({ rowCount: 1, rows: [] })
      // INSERT token_transactions
      .mockResolvedValueOnce({ rowCount: 1, rows: [] });

    const renewed = await maybeRenewPlanTokens('user-123');
    expect(renewed).toBe(true);

    // Verify UPDATE set plan_tokens to pro allocation
    const updateCall = mockQuery.mock.calls[1];
    expect(updateCall[1]).toEqual([500, 'user-123']);

    // Verify transaction log
    const logCall = mockQuery.mock.calls[2];
    expect(logCall[0]).toContain('plan_renewal');
    expect(logCall[1][1]).toBe(500); // amount = allocation
  });

  it('does NOT renew within same month', async () => {
    mockQuery.mockResolvedValueOnce({
      rowCount: 1,
      rows: [{
        plan: 'free',
        plan_tokens: 50,
        tokens_renewed_at: new Date(), // same month
      }],
    });

    const renewed = await maybeRenewPlanTokens('user-123');
    expect(renewed).toBe(false);
    // Only 1 query (the SELECT) — no UPDATE
    expect(mockQuery).toHaveBeenCalledTimes(1);
  });

  it('returns false for nonexistent user', async () => {
    mockQuery.mockResolvedValueOnce({ rowCount: 0, rows: [] });

    const renewed = await maybeRenewPlanTokens('ghost');
    expect(renewed).toBe(false);
  });

  it('uses free tier allocation for unknown plans', async () => {
    const lastMonth = new Date();
    lastMonth.setUTCMonth(lastMonth.getUTCMonth() - 1);

    mockQuery
      .mockResolvedValueOnce({
        rowCount: 1,
        rows: [{
          plan: 'unknown_plan',
          plan_tokens: 0,
          tokens_renewed_at: lastMonth,
        }],
      })
      .mockResolvedValueOnce({ rowCount: 1, rows: [] })
      .mockResolvedValueOnce({ rowCount: 1, rows: [] });

    const renewed = await maybeRenewPlanTokens('user-123');
    expect(renewed).toBe(true);

    // Falls back to free allocation (100)
    const updateCall = mockQuery.mock.calls[1];
    expect(updateCall[1]).toEqual([100, 'user-123']);
  });
});
