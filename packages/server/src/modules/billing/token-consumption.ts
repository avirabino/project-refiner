/**
 * Token Consumption Engine
 *
 * SXC two-tier model: plan_tokens consumed first, then purchased_tokens.
 * All balance checks from DB, not JWT (ADR S09-001, D042).
 *
 * Sprint 09 — Track C (C02)
 */
import { getPool } from '../../db/client.js';
import { PLAN_TOKEN_ALLOCATIONS } from './paddle.config.js';
import type { ConsumeTokenResult } from './billing.schemas.js';
import type { UserPlan } from '../../shared/db/schema.js';

// ============================================================================
// Constants
// ============================================================================

/** Threshold percentage of plan token consumption that triggers a warning. */
const PLAN_THRESHOLD_PERCENT = 0.85;

// ============================================================================
// Token Consumption
// ============================================================================

/**
 * Consume SXC tokens from a user's balance.
 *
 * Strategy: deduct from plan_tokens first, then purchased_tokens.
 * Logs every transaction to token_transactions table.
 *
 * @param userId - User UUID
 * @param amount - Number of tokens to consume (positive integer)
 * @param actionType - Action that triggered consumption (e.g., 'session_capture', 'bug_autocomplete')
 * @param metadata - Optional JSONB metadata (article_id, session_id, etc.)
 * @returns Consumption result with remaining balance and threshold info
 */
export async function consumeToken(
  userId: string,
  amount: number,
  actionType: string,
  metadata?: Record<string, unknown>,
): Promise<ConsumeTokenResult> {
  const pool = getPool();

  // 1. Get current balances from DB (D042: NEVER trust JWT)
  const userResult = await pool.query(
    `SELECT plan, plan_tokens, purchased_tokens, total_tokens_used, tokens_renewed_at
     FROM users WHERE id = $1`,
    [userId],
  );

  if (userResult.rowCount === 0) {
    return { success: false, reason: 'user_not_found' };
  }

  const user = userResult.rows[0] as {
    plan: string;
    plan_tokens: number;
    purchased_tokens: number;
    total_tokens_used: number;
    tokens_renewed_at: Date;
  };

  // 2. Lazy renewal check before consumption
  await maybeRenewPlanTokens(userId);

  // Re-read after potential renewal
  const refreshed = await pool.query(
    'SELECT plan_tokens, purchased_tokens, total_tokens_used FROM users WHERE id = $1',
    [userId],
  );
  const current = refreshed.rows[0] as {
    plan_tokens: number;
    purchased_tokens: number;
    total_tokens_used: number;
  };

  const totalAvailable = current.plan_tokens + current.purchased_tokens;

  // 3. Check sufficient balance
  if (totalAvailable < amount) {
    return {
      success: false,
      reason: 'insufficient_balance',
      remaining: {
        plan: current.plan_tokens,
        purchased: current.purchased_tokens,
      },
    };
  }

  // 4. Deduct: plan_tokens first, then purchased_tokens
  let planDeduct = Math.min(current.plan_tokens, amount);
  let purchasedDeduct = amount - planDeduct;

  const newPlanTokens = current.plan_tokens - planDeduct;
  const newPurchasedTokens = current.purchased_tokens - purchasedDeduct;
  const newTotalUsed = current.total_tokens_used + amount;

  // 5. Update user balance
  await pool.query(
    `UPDATE users
     SET plan_tokens = $1,
         purchased_tokens = $2,
         total_tokens_used = $3
     WHERE id = $4`,
    [newPlanTokens, newPurchasedTokens, newTotalUsed, userId],
  );

  // 6. Log transaction
  const newBalance = newPlanTokens + newPurchasedTokens;
  await pool.query(
    `INSERT INTO token_transactions (user_id, action_type, amount, balance, metadata)
     VALUES ($1, $2, $3, $4, $5)`,
    [userId, actionType, -amount, newBalance, metadata ? JSON.stringify(metadata) : null],
  );

  // 7. Check threshold warning (85% plan consumption)
  const planAllocation = PLAN_TOKEN_ALLOCATIONS[user.plan as UserPlan] ?? PLAN_TOKEN_ALLOCATIONS.free;
  const planUsedPercent = 1 - newPlanTokens / planAllocation;
  const thresholdReached = planUsedPercent >= PLAN_THRESHOLD_PERCENT;

  if (thresholdReached) {
    console.log(
      `[billing] Threshold warning: user ${userId} has used ${Math.round(planUsedPercent * 100)}% of plan tokens (${newPlanTokens} remaining of ${planAllocation})`,
    );
  }

  return {
    success: true,
    remaining: {
      plan: newPlanTokens,
      purchased: newPurchasedTokens,
    },
    thresholdReached,
  };
}

// ============================================================================
// Lazy Monthly Renewal
// ============================================================================

/**
 * Check if plan tokens should be renewed (month boundary crossed).
 *
 * NOTE: This function exists in auth.service.ts as well (called on login).
 * This version is a standalone DB-driven version that reads state fresh,
 * suitable for being called from token consumption or any billing operation.
 *
 * If the current month (UTC) differs from tokens_renewed_at, reset plan_tokens
 * to the tier allocation and log a 'plan_renewal' transaction.
 *
 * @param userId - User UUID
 * @returns true if renewal was performed
 */
export async function maybeRenewPlanTokens(userId: string): Promise<boolean> {
  const pool = getPool();

  // Read current state from DB
  const result = await pool.query(
    'SELECT plan, plan_tokens, tokens_renewed_at FROM users WHERE id = $1',
    [userId],
  );

  if (result.rowCount === 0) {
    return false;
  }

  const user = result.rows[0] as {
    plan: string;
    plan_tokens: number;
    tokens_renewed_at: Date;
  };

  const now = new Date();
  const renewedAt = new Date(user.tokens_renewed_at);

  // Check month boundary (UTC)
  const sameMonth =
    now.getUTCFullYear() === renewedAt.getUTCFullYear() &&
    now.getUTCMonth() === renewedAt.getUTCMonth();

  if (sameMonth) {
    return false;
  }

  const allocation = PLAN_TOKEN_ALLOCATIONS[user.plan as UserPlan] ?? PLAN_TOKEN_ALLOCATIONS.free;

  // Reset plan tokens and update renewal timestamp
  await pool.query(
    `UPDATE users SET plan_tokens = $1, tokens_renewed_at = now() WHERE id = $2`,
    [allocation, userId],
  );

  // Log renewal transaction
  await pool.query(
    `INSERT INTO token_transactions (user_id, action_type, amount, balance, metadata)
     VALUES ($1, 'plan_renewal', $2, $3, $4)`,
    [
      userId,
      allocation,
      allocation, // balance after renewal (plan only — purchased unchanged)
      JSON.stringify({ plan: user.plan, previousTokens: user.plan_tokens }),
    ],
  );

  console.log(`[billing] SXC renewal: user ${userId} plan=${user.plan} tokens reset to ${allocation}`);
  return true;
}
