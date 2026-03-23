/**
 * Billing Service — Business Logic
 *
 * Pure business logic for billing operations. No Express req/res.
 * Handles balance queries, subscription portal, and promo code redemption.
 *
 * All balance checks from DB, not JWT (ADR S09-001, D042).
 *
 * Sprint 09 — Track C (C04, C05)
 */
import { getPool } from '../../db/client.js';
import type { BalanceResponse, PortalResponse } from './billing.schemas.js';

// ============================================================================
// Error class (mirrors AuthError pattern)
// ============================================================================

export class BillingError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly statusCode: number,
  ) {
    super(message);
    this.name = 'BillingError';
  }
}

// ============================================================================
// Balance API (C04)
// ============================================================================

/**
 * Get user's SXC balance from DB (D042: never from JWT).
 *
 * @param userId - User UUID
 * @returns Balance response with plan info and renewal date
 */
export async function getBalance(userId: string): Promise<BalanceResponse> {
  const pool = getPool();

  const result = await pool.query(
    `SELECT plan, plan_tokens, purchased_tokens, total_tokens_used, tokens_renewed_at
     FROM users WHERE id = $1`,
    [userId],
  );

  if (result.rowCount === 0) {
    throw new BillingError('USER_NOT_FOUND', 'User not found', 404);
  }

  const row = result.rows[0] as {
    plan: string;
    plan_tokens: number;
    purchased_tokens: number;
    total_tokens_used: number;
    tokens_renewed_at: Date;
  };

  // Calculate next renewal date (first day of next month UTC)
  const renewedAt = new Date(row.tokens_renewed_at);
  const renewsAt = new Date(Date.UTC(
    renewedAt.getUTCFullYear(),
    renewedAt.getUTCMonth() + 1,
    1,
  ));

  return {
    planTokens: row.plan_tokens,
    purchasedTokens: row.purchased_tokens,
    totalUsed: row.total_tokens_used,
    plan: row.plan,
    renewsAt: renewsAt.toISOString(),
  };
}

// ============================================================================
// Subscription Portal (C04)
// ============================================================================

/**
 * Generate a Paddle customer portal URL.
 *
 * NOTE: In Sprint 09, this returns a placeholder URL with the paddle_customer_id.
 * Full Paddle API integration will use the Paddle SDK in production.
 *
 * @param userId - User UUID
 * @returns Portal URL
 */
export async function getSubscriptionPortal(userId: string): Promise<PortalResponse> {
  const pool = getPool();

  const result = await pool.query(
    'SELECT paddle_customer_id FROM users WHERE id = $1',
    [userId],
  );

  if (result.rowCount === 0) {
    throw new BillingError('USER_NOT_FOUND', 'User not found', 404);
  }

  const paddleCustomerId = result.rows[0].paddle_customer_id as string | null;

  if (!paddleCustomerId) {
    throw new BillingError(
      'NO_SUBSCRIPTION',
      'No active subscription found. Subscribe first to manage billing.',
      400,
    );
  }

  // Placeholder URL — will call Paddle API in production
  const paddleEnv = process.env.PADDLE_ENVIRONMENT === 'production' ? '' : 'sandbox-';
  const url = `https://${paddleEnv}customer-portal.paddle.com/cus/${paddleCustomerId}`;

  return { url };
}

// ============================================================================
// Promo Code Redemption (C05)
// ============================================================================

/**
 * Redeem a promo code.
 *
 * Validates: code exists (case-insensitive), not expired, usedCount < maxUses,
 * user hasn't already redeemed this code.
 *
 * On success: adds tokens to purchased_tokens (NOT plan_tokens), increments
 * usedCount, logs transaction.
 *
 * @param userId - User UUID
 * @param code - Promo code (already uppercased by schema validation)
 * @returns Number of tokens added
 */
export async function redeemPromoCode(
  userId: string,
  code: string,
): Promise<{ tokensAdded: number; newPurchasedBalance: number }> {
  const pool = getPool();

  // 1. Find promo code (case-insensitive — code is already uppercased by schema)
  const promoResult = await pool.query(
    `SELECT id, code, token_amount, max_uses, used_count, expires_at
     FROM promo_codes WHERE UPPER(code) = $1`,
    [code],
  );

  if (promoResult.rowCount === 0) {
    throw new BillingError('INVALID_PROMO', 'Invalid promo code', 400);
  }

  const promo = promoResult.rows[0] as {
    id: string;
    code: string;
    token_amount: number;
    max_uses: number | null;
    used_count: number;
    expires_at: Date | null;
  };

  // 2. Check expiry
  if (promo.expires_at && new Date(promo.expires_at) < new Date()) {
    throw new BillingError('PROMO_EXPIRED', 'This promo code has expired', 400);
  }

  // 3. Check max uses
  if (promo.max_uses !== null && promo.used_count >= promo.max_uses) {
    throw new BillingError('PROMO_EXHAUSTED', 'This promo code has reached its maximum uses', 400);
  }

  // 4. Check if user already redeemed this code
  const redeemCheck = await pool.query(
    `SELECT id FROM promo_code_redemptions
     WHERE user_id = $1 AND promo_code_id = $2`,
    [userId, promo.id],
  );

  if (redeemCheck.rowCount && redeemCheck.rowCount > 0) {
    throw new BillingError('PROMO_ALREADY_REDEEMED', 'You have already redeemed this promo code', 400);
  }

  // 5. Add tokens to purchased_tokens (NOT plan_tokens)
  await pool.query(
    `UPDATE users SET purchased_tokens = purchased_tokens + $1 WHERE id = $2`,
    [promo.token_amount, userId],
  );

  // 6. Record redemption
  await pool.query(
    `INSERT INTO promo_code_redemptions (user_id, promo_code_id)
     VALUES ($1, $2)`,
    [userId, promo.id],
  );

  // 7. Increment used_count
  await pool.query(
    `UPDATE promo_codes SET used_count = used_count + 1 WHERE id = $1`,
    [promo.id],
  );

  // 8. Get updated balance
  const balanceResult = await pool.query(
    'SELECT plan_tokens, purchased_tokens FROM users WHERE id = $1',
    [userId],
  );
  const balance = balanceResult.rows[0];
  const totalBalance = (balance.plan_tokens as number) + (balance.purchased_tokens as number);

  // 9. Log transaction
  await pool.query(
    `INSERT INTO token_transactions (user_id, action_type, amount, balance, metadata)
     VALUES ($1, 'promo_redemption', $2, $3, $4)`,
    [
      userId,
      promo.token_amount,
      totalBalance,
      JSON.stringify({
        promoCode: promo.code,
        promoId: promo.id,
      }),
    ],
  );

  console.log(`[billing] Promo redeemed: user ${userId} code=${promo.code} +${promo.token_amount} SXC`);

  return {
    tokensAdded: promo.token_amount,
    newPurchasedBalance: balance.purchased_tokens as number,
  };
}
