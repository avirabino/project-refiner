/**
 * Billing Zod Validation Schemas
 *
 * All input validation for billing endpoints.
 * Sprint 09 — Track C
 */
import { z } from 'zod';

// ============================================================================
// Request schemas
// ============================================================================

/** POST /api/billing/redeem-promo */
export const redeemPromoSchema = z.object({
  code: z
    .string()
    .min(1, 'Promo code is required')
    .max(50, 'Promo code must not exceed 50 characters')
    .transform((v) => v.trim().toUpperCase()),
});
export type RedeemPromoInput = z.infer<typeof redeemPromoSchema>;

// ============================================================================
// Response types (not Zod — just TS interfaces for documentation)
// ============================================================================

/** GET /api/billing/balance response */
export interface BalanceResponse {
  planTokens: number;
  purchasedTokens: number;
  totalUsed: number;
  plan: string;
  renewsAt: string; // ISO date string
}

/** POST /api/subscription/portal response */
export interface PortalResponse {
  url: string;
}

/** Token consumption result */
export interface ConsumeTokenResult {
  success: boolean;
  remaining?: {
    plan: number;
    purchased: number;
  };
  thresholdReached?: boolean;
  reason?: string;
}
