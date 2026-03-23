# Billing Module

## Purpose

SXC credit system and Paddle payment integration for vigil-server. Handles token consumption (two-tier: plan + purchased), subscription lifecycle via Paddle webhooks, balance queries, promo code redemption, and customer portal access.

**Authoritative spec:** `docs/sprints/sprint_09/specs/SPRINT_09_SPEC_production_launch.md` section 4

## Owner

`[DEV:server]` — Server Team

## Public API

### Routes

#### Billing Router (`billingRouter` — mounted at `/api/billing`)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | /api/billing/balance | Bearer | SXC balance from DB (plan + purchased + usage) |
| POST | /api/billing/redeem-promo | Bearer | Redeem promo code for purchased tokens |

#### Subscription Router (`subscriptionRouter` — mounted at `/api/subscription`)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | /api/subscription/portal | Bearer | Generate Paddle customer portal URL |

#### Webhook Router (`webhookRouter` — mounted at `/api/webhooks`)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | /api/webhooks/paddle | Public (HMAC) | Paddle webhook handler (signature-verified) |

#### Auth Integration (`redeemPromoHandler`)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | /api/auth/redeem-promo | Bearer | Promo redemption (mounted on auth router) |

### Token Consumption Engine

```typescript
import { consumeToken, maybeRenewPlanTokens } from './modules/billing/index.js';

// Consume tokens (plan first, then purchased)
const result = await consumeToken(userId, 5, 'session_capture', { sessionId });
if (!result.success) {
  // result.reason === 'insufficient_balance'
}

// Lazy monthly renewal (called automatically by consumeToken)
const renewed = await maybeRenewPlanTokens(userId);
```

### Paddle Config

```typescript
import { planFromPriceId, tokenPackFromPriceId, PLAN_TOKEN_ALLOCATIONS } from './modules/billing/index.js';

const plan = planFromPriceId('pri_abc123');  // { plan: 'pro', tokens: 500, period: 'monthly' }
const pack = tokenPackFromPriceId('pri_xyz'); // { name: 'Spark', tokens: 200 }
```

## Dependencies

| Module | Purpose |
|--------|---------|
| `../../db/client.js` | Neon PostgreSQL pool |
| `../../shared/db/schema.js` | TypeScript type definitions |
| `../auth/index.js` | Auth middleware for route protection |
| `zod` | Input validation schemas |

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | Neon PostgreSQL connection string |
| `PADDLE_WEBHOOK_SECRET` | Yes (for webhooks) | HMAC-SHA256 signing secret from Paddle |
| `PADDLE_ENVIRONMENT` | No | `production` or `sandbox` (default: sandbox) |
| `PADDLE_PRICE_PRO_MONTHLY` | No | Paddle price ID for Pro monthly |
| `PADDLE_PRICE_PRO_ANNUAL` | No | Paddle price ID for Pro annual |
| `PADDLE_PRICE_TEAM_MONTHLY` | No | Paddle price ID for Team monthly |
| `PADDLE_PRICE_TEAM_ANNUAL` | No | Paddle price ID for Team annual |
| `PADDLE_PRICE_ENTERPRISE_MONTHLY` | No | Paddle price ID for Enterprise monthly |
| `PADDLE_PRICE_ENTERPRISE_ANNUAL` | No | Paddle price ID for Enterprise annual |
| `PADDLE_PRICE_SPARK` | No | Paddle price ID for Spark token pack (200 SXC) |
| `PADDLE_PRICE_FLOW` | No | Paddle price ID for Flow token pack (1000 SXC) |
| `PADDLE_PRICE_SURGE` | No | Paddle price ID for Surge token pack (5000 SXC) |

## File Structure

```
modules/billing/
  README.md              # This file
  index.ts               # Public barrel exports
  billing.routes.ts      # Express route handlers (thin)
  billing.service.ts     # Business logic (balance, promo, portal)
  billing.schemas.ts     # Zod validation schemas
  paddle.webhook.ts      # Paddle webhook handler + signature verification
  paddle.config.ts       # Price ID mappings (single source of truth)
  token-consumption.ts   # Two-tier token consumption engine
  tests/                 # Unit tests
```

## Key Design Decisions

1. **Two-tier tokens** — Plan tokens consumed first, then purchased tokens. Plan tokens reset monthly; purchased tokens never expire.
2. **DB is authority** (D042) — All balance checks query the database. JWT claims are convenience only.
3. **Idempotent webhooks** — Every webhook handler can safely process the same event twice (SET operations, not increments for subscriptions; dedup check for token packs).
4. **HMAC-SHA256 verification** — Paddle webhooks verified using `paddle-signature` header with timing-safe comparison.
5. **Lazy renewal** — Plan tokens renewed on consumption (and on login via auth module). No cron job needed.
6. **Promo codes add to purchased_tokens** — Never to plan_tokens. This ensures promos survive monthly resets.

## Testing

```bash
npx vitest run modules/billing/
```

## Changelog

| Sprint | Change |
|--------|--------|
| 09 | Initial implementation — full billing system |
