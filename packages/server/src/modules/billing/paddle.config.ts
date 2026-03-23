/**
 * Paddle Configuration — Single Source of Truth for Price IDs
 *
 * Maps Paddle price IDs (from env vars) to Vigil plan tiers and token packs.
 * All price IDs come from environment variables — never hardcoded.
 *
 * Sprint 09 — Track C (C06)
 * Spec: SPRINT_09_SPEC_production_launch.md §4
 */

import type { UserPlan, BillingPeriod } from '../../shared/db/schema.js';

// ============================================================================
// Types
// ============================================================================

export interface PlanMapping {
  plan: UserPlan;
  tokens: number;
  period: BillingPeriod;
}

export interface TokenPackMapping {
  name: string;
  tokens: number;
}

// ============================================================================
// Tier token allocations — single source of truth
// ============================================================================

/** Monthly SXC token allocation per plan tier. */
export const PLAN_TOKEN_ALLOCATIONS: Record<UserPlan, number> = {
  free: 100,
  pro: 500,
  team: 2000,
  enterprise: 100000,
};

// ============================================================================
// Price ID → Plan mapping
// ============================================================================

/**
 * Build the price-to-plan map from env vars at module load time.
 * Missing env vars result in undefined entries (gracefully skipped).
 */
function buildPlanPriceMap(): Map<string, PlanMapping> {
  const map = new Map<string, PlanMapping>();

  const entries: Array<{
    envVar: string;
    plan: UserPlan;
    period: BillingPeriod;
  }> = [
    { envVar: 'PADDLE_PRICE_PRO_MONTHLY', plan: 'pro', period: 'monthly' },
    { envVar: 'PADDLE_PRICE_PRO_ANNUAL', plan: 'pro', period: 'yearly' },
    { envVar: 'PADDLE_PRICE_TEAM_MONTHLY', plan: 'team', period: 'monthly' },
    { envVar: 'PADDLE_PRICE_TEAM_ANNUAL', plan: 'team', period: 'yearly' },
    { envVar: 'PADDLE_PRICE_ENTERPRISE_MONTHLY', plan: 'enterprise', period: 'monthly' },
    { envVar: 'PADDLE_PRICE_ENTERPRISE_ANNUAL', plan: 'enterprise', period: 'yearly' },
  ];

  for (const { envVar, plan, period } of entries) {
    const priceId = process.env[envVar];
    if (priceId) {
      map.set(priceId, {
        plan,
        tokens: PLAN_TOKEN_ALLOCATIONS[plan],
        period,
      });
    }
  }

  return map;
}

/**
 * Build the price-to-token-pack map from env vars at module load time.
 */
function buildTokenPackPriceMap(): Map<string, TokenPackMapping> {
  const map = new Map<string, TokenPackMapping>();

  const entries: Array<{
    envVar: string;
    name: string;
    tokens: number;
  }> = [
    { envVar: 'PADDLE_PRICE_SPARK', name: 'Spark', tokens: 200 },
    { envVar: 'PADDLE_PRICE_FLOW', name: 'Flow', tokens: 1000 },
    { envVar: 'PADDLE_PRICE_SURGE', name: 'Surge', tokens: 5000 },
  ];

  for (const { envVar, name, tokens } of entries) {
    const priceId = process.env[envVar];
    if (priceId) {
      map.set(priceId, { name, tokens });
    }
  }

  return map;
}

// Lazy-initialized maps (rebuilt on first access to capture env vars set after import)
let _planMap: Map<string, PlanMapping> | null = null;
let _packMap: Map<string, TokenPackMapping> | null = null;

function getPlanMap(): Map<string, PlanMapping> {
  if (!_planMap) {
    _planMap = buildPlanPriceMap();
  }
  return _planMap;
}

function getPackMap(): Map<string, TokenPackMapping> {
  if (!_packMap) {
    _packMap = buildTokenPackPriceMap();
  }
  return _packMap;
}

// ============================================================================
// Public API
// ============================================================================

/**
 * Look up a Vigil plan from a Paddle price ID.
 * @returns Plan mapping or null if the price ID is not a subscription plan.
 */
export function planFromPriceId(priceId: string): PlanMapping | null {
  return getPlanMap().get(priceId) ?? null;
}

/**
 * Look up a token pack from a Paddle price ID.
 * @returns Token pack mapping or null if the price ID is not a token pack.
 */
export function tokenPackFromPriceId(priceId: string): TokenPackMapping | null {
  return getPackMap().get(priceId) ?? null;
}

/**
 * Get the Paddle webhook secret from env.
 * @throws if PADDLE_WEBHOOK_SECRET is not set.
 */
export function getPaddleWebhookSecret(): string {
  const secret = process.env.PADDLE_WEBHOOK_SECRET;
  if (!secret) {
    throw new Error('PADDLE_WEBHOOK_SECRET environment variable is not set');
  }
  return secret;
}

/**
 * Reset cached price maps (for testing — env vars may change between tests).
 */
export function _resetPriceMaps(): void {
  _planMap = null;
  _packMap = null;
}
