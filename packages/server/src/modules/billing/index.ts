/**
 * Billing Module — Public Exports
 *
 * Only import from this barrel file. Internal files are private.
 * See README.md for module documentation.
 */

// Routes
export { billingRouter, subscriptionRouter, redeemPromoHandler } from './billing.routes.js';
export { webhookRouter } from './paddle.webhook.js';

// Service
export { BillingError, getBalance, getSubscriptionPortal, redeemPromoCode } from './billing.service.js';

// Token consumption engine
export { consumeToken, maybeRenewPlanTokens } from './token-consumption.js';

// Paddle config
export {
  planFromPriceId,
  tokenPackFromPriceId,
  PLAN_TOKEN_ALLOCATIONS,
  getPaddleWebhookSecret,
} from './paddle.config.js';
export type { PlanMapping, TokenPackMapping } from './paddle.config.js';

// Schemas
export { redeemPromoSchema } from './billing.schemas.js';
export type {
  RedeemPromoInput,
  BalanceResponse,
  PortalResponse,
  ConsumeTokenResult,
} from './billing.schemas.js';
