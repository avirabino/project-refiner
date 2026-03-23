/**
 * Billing Routes — /api/billing/* and /api/subscription/* and /api/auth/redeem-promo
 *
 * Thin route handlers that delegate to billing.service.ts.
 * All input validation via Zod schemas from billing.schemas.ts.
 *
 * Sprint 09 — Track C (C04, C05)
 *
 * Route contract from ADR S09-001:
 *
 * AUTHENTICATED:
 *   GET  /api/billing/balance       → SXC balance from DB
 *   POST /api/subscription/portal   → Paddle customer portal URL
 *   POST /api/billing/redeem-promo  → Redeem promo code
 */
import { Router } from 'express';
import type { Request, Response } from 'express';
import { ZodError } from 'zod';
import { redeemPromoSchema } from './billing.schemas.js';
import { getBalance, getSubscriptionPortal, redeemPromoCode, BillingError } from './billing.service.js';
import { authMiddleware } from '../auth/index.js';

export const billingRouter = Router();

// ============================================================================
// All billing routes require authentication
// ============================================================================

billingRouter.use(authMiddleware);

// ============================================================================
// GET /api/billing/balance
// ============================================================================

/**
 * Get current SXC balance (from DB, NOT JWT — D042).
 */
billingRouter.get('/balance', async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }
    const balance = await getBalance(req.user.id);
    res.json(balance);
  } catch (err) {
    handleBillingError(res, err);
  }
});

// ============================================================================
// POST /api/billing/redeem-promo
// ============================================================================

/**
 * Redeem a promo code → add tokens to purchased_tokens.
 *
 * NOTE: The spec says POST /api/auth/redeem-promo but we also mount it
 * under /api/billing/redeem-promo for consistency. The auth router
 * can forward to this handler.
 */
billingRouter.post('/redeem-promo', async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }
    const input = redeemPromoSchema.parse(req.body);
    const result = await redeemPromoCode(req.user.id, input.code);
    res.json({
      message: `Promo code redeemed! +${result.tokensAdded} SXC tokens added.`,
      tokensAdded: result.tokensAdded,
      purchasedTokens: result.newPurchasedBalance,
    });
  } catch (err) {
    handleBillingError(res, err);
  }
});

// ============================================================================
// Subscription Portal Router (mounted at /api/subscription)
// ============================================================================

export const subscriptionRouter = Router();

subscriptionRouter.use(authMiddleware);

/**
 * POST /api/subscription/portal → Paddle customer portal URL.
 */
subscriptionRouter.post('/portal', async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }
    const portal = await getSubscriptionPortal(req.user.id);
    res.json(portal);
  } catch (err) {
    handleBillingError(res, err);
  }
});

// ============================================================================
// Promo code route handler (for /api/auth/redeem-promo mounting)
// ============================================================================

/**
 * Standalone promo redemption handler for mounting on authRouter.
 * POST /api/auth/redeem-promo
 */
export async function redeemPromoHandler(req: Request, res: Response): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }
    const input = redeemPromoSchema.parse(req.body);
    const result = await redeemPromoCode(req.user.id, input.code);
    res.json({
      message: `Promo code redeemed! +${result.tokensAdded} SXC tokens added.`,
      tokensAdded: result.tokensAdded,
      purchasedTokens: result.newPurchasedBalance,
    });
  } catch (err) {
    handleBillingError(res, err);
  }
}

// ============================================================================
// Error handler (mirrors auth module pattern)
// ============================================================================

function handleBillingError(res: Response, err: unknown): void {
  if (err instanceof BillingError) {
    res.status(err.statusCode).json({
      error: err.message,
      code: err.code,
    });
    return;
  }

  if (err instanceof ZodError) {
    res.status(400).json({
      error: 'Validation failed',
      details: err.errors.map((e) => ({
        field: e.path.join('.'),
        message: e.message,
      })),
    });
    return;
  }

  console.error('[billing] Unexpected error:', err);
  res.status(500).json({ error: 'Internal server error' });
}
