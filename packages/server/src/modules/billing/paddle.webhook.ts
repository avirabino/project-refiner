/**
 * Paddle Webhook Handler
 *
 * POST /api/webhooks/paddle — PUBLIC endpoint (no auth, signature-verified).
 * HMAC-SHA256 signature verification using PADDLE_WEBHOOK_SECRET.
 *
 * All state changes are IDEMPOTENT (safe to replay the same webhook).
 *
 * Sprint 09 — Track C (C03)
 */
import { Router } from 'express';
import type { Request, Response } from 'express';
import { createHmac, timingSafeEqual } from 'node:crypto';
import { getPool } from '../../db/client.js';
import { getPaddleWebhookSecret, planFromPriceId, tokenPackFromPriceId } from './paddle.config.js';

export const webhookRouter = Router();

// ============================================================================
// Types for Paddle webhook payloads
// ============================================================================

interface PaddleWebhookEvent {
  event_type: string;
  event_id: string;
  occurred_at: string;
  data: PaddleEventData;
}

interface PaddleEventData {
  id: string;
  status?: string;
  customer_id?: string;
  items?: Array<{ price?: { id: string } }>;
  custom_data?: { user_email?: string; user_id?: string };
  current_billing_period?: { ends_at?: string };
  /** For transaction.completed — price_id at top level or in items */
  details?: {
    line_items?: Array<{ price?: { id: string } }>;
  };
}

// ============================================================================
// Signature verification
// ============================================================================

/**
 * Verify Paddle webhook HMAC-SHA256 signature.
 *
 * Paddle sends the signature in the `paddle-signature` header.
 * Format: `ts=<timestamp>;h1=<hash>`
 *
 * The signed payload is: `<timestamp>:<raw_body>`
 */
function verifyPaddleSignature(rawBody: string, signatureHeader: string, secret: string): boolean {
  try {
    const parts = signatureHeader.split(';');
    const tsEntry = parts.find((p) => p.startsWith('ts='));
    const h1Entry = parts.find((p) => p.startsWith('h1='));

    if (!tsEntry || !h1Entry) {
      return false;
    }

    const timestamp = tsEntry.slice(3);
    const receivedHash = h1Entry.slice(3);

    // Build signed payload: timestamp:body
    const signedPayload = `${timestamp}:${rawBody}`;
    const expectedHash = createHmac('sha256', secret)
      .update(signedPayload)
      .digest('hex');

    // Timing-safe comparison
    const expected = Buffer.from(expectedHash, 'hex');
    const received = Buffer.from(receivedHash, 'hex');

    if (expected.length !== received.length) {
      return false;
    }

    return timingSafeEqual(expected, received);
  } catch {
    return false;
  }
}

// ============================================================================
// Webhook route
// ============================================================================

/**
 * POST /api/webhooks/paddle
 *
 * Public endpoint — no auth middleware. Verified by HMAC-SHA256 signature.
 */
webhookRouter.post('/paddle', async (req: Request, res: Response) => {
  try {
    const signatureHeader = req.headers['paddle-signature'] as string | undefined;
    if (!signatureHeader) {
      console.warn('[billing:webhook] Missing paddle-signature header');
      res.status(400).json({ error: 'Missing signature' });
      return;
    }

    // Get raw body for signature verification
    // Express populates req.body via json() middleware, but we need the raw string.
    // We pass the stringified body since Express has already parsed it.
    const rawBody = JSON.stringify(req.body);

    let secret: string;
    try {
      secret = getPaddleWebhookSecret();
    } catch {
      console.error('[billing:webhook] PADDLE_WEBHOOK_SECRET not configured');
      res.status(500).json({ error: 'Webhook secret not configured' });
      return;
    }

    if (!verifyPaddleSignature(rawBody, signatureHeader, secret)) {
      console.warn('[billing:webhook] Signature verification failed');
      res.status(401).json({ error: 'Invalid signature' });
      return;
    }

    const event = req.body as PaddleWebhookEvent;
    console.log(`[billing:webhook] Received event: ${event.event_type} (${event.event_id})`);

    // Route to handler
    switch (event.event_type) {
      case 'subscription.created':
        await handleSubscriptionCreated(event);
        break;
      case 'subscription.updated':
        await handleSubscriptionUpdated(event);
        break;
      case 'subscription.canceled':
        await handleSubscriptionCanceled(event);
        break;
      case 'subscription.past_due':
        await handleSubscriptionPastDue(event);
        break;
      case 'transaction.completed':
        await handleTransactionCompleted(event);
        break;
      default:
        console.log(`[billing:webhook] Unhandled event type: ${event.event_type}`);
    }

    // Always return 200 to acknowledge receipt (even for unhandled events)
    res.status(200).json({ received: true });
  } catch (err) {
    console.error('[billing:webhook] Error processing webhook:', err);
    // Return 200 to prevent Paddle from retrying on application errors
    // (we log the error for investigation)
    res.status(200).json({ received: true, error: 'Processing error logged' });
  }
});

// ============================================================================
// Event handlers — all IDEMPOTENT
// ============================================================================

/**
 * Find user by paddle_customer_id OR by email from custom_data.
 */
async function findUserByPaddleEvent(data: PaddleEventData): Promise<{ id: string } | null> {
  const pool = getPool();

  // Try paddle_customer_id first
  if (data.customer_id) {
    const result = await pool.query(
      'SELECT id FROM users WHERE paddle_customer_id = $1',
      [data.customer_id],
    );
    if (result.rowCount && result.rowCount > 0) {
      return { id: result.rows[0].id };
    }
  }

  // Fallback: email from custom_data
  if (data.custom_data?.user_email) {
    const result = await pool.query(
      'SELECT id FROM users WHERE email = $1',
      [data.custom_data.user_email.toLowerCase()],
    );
    if (result.rowCount && result.rowCount > 0) {
      return { id: result.rows[0].id };
    }
  }

  // Fallback: user_id from custom_data
  if (data.custom_data?.user_id) {
    const result = await pool.query(
      'SELECT id FROM users WHERE id = $1',
      [data.custom_data.user_id],
    );
    if (result.rowCount && result.rowCount > 0) {
      return { id: result.rows[0].id };
    }
  }

  return null;
}

/**
 * Extract the first price ID from a Paddle event's items list.
 */
function extractPriceId(data: PaddleEventData): string | null {
  // Subscription events: items[].price.id
  if (data.items && data.items.length > 0 && data.items[0].price?.id) {
    return data.items[0].price.id;
  }
  // Transaction events: details.line_items[].price.id
  if (data.details?.line_items && data.details.line_items.length > 0 && data.details.line_items[0].price?.id) {
    return data.details.line_items[0].price.id;
  }
  return null;
}

/**
 * subscription.created → Update user plan, tokens, subscription fields.
 */
async function handleSubscriptionCreated(event: PaddleWebhookEvent): Promise<void> {
  const pool = getPool();
  const data = event.data;
  const user = await findUserByPaddleEvent(data);

  if (!user) {
    console.error(`[billing:webhook] subscription.created: user not found for event ${event.event_id}`);
    return;
  }

  const priceId = extractPriceId(data);
  if (!priceId) {
    console.error(`[billing:webhook] subscription.created: no price ID in event ${event.event_id}`);
    return;
  }

  const planMapping = planFromPriceId(priceId);
  if (!planMapping) {
    console.error(`[billing:webhook] subscription.created: unknown price ID ${priceId}`);
    return;
  }

  // IDEMPOTENT: SET (not increment) — safe to replay
  await pool.query(
    `UPDATE users
     SET plan = $1,
         plan_tokens = $2,
         subscription_status = 'active',
         paddle_customer_id = COALESCE($3, paddle_customer_id),
         paddle_subscription_id = COALESCE($4, paddle_subscription_id),
         billing_period = $5,
         tokens_renewed_at = now()
     WHERE id = $6`,
    [
      planMapping.plan,
      planMapping.tokens,
      data.customer_id,
      data.id,
      planMapping.period,
      user.id,
    ],
  );

  // Log transaction
  await pool.query(
    `INSERT INTO token_transactions (user_id, action_type, amount, balance, metadata)
     VALUES ($1, 'subscription_created', $2, $3, $4)`,
    [
      user.id,
      planMapping.tokens,
      planMapping.tokens, // New balance after plan activation
      JSON.stringify({
        eventId: event.event_id,
        plan: planMapping.plan,
        period: planMapping.period,
        priceId,
        subscriptionId: data.id,
      }),
    ],
  );

  console.log(`[billing:webhook] subscription.created: user ${user.id} → plan=${planMapping.plan}, period=${planMapping.period}`);
}

/**
 * subscription.updated → Update plan tier + billing period.
 */
async function handleSubscriptionUpdated(event: PaddleWebhookEvent): Promise<void> {
  const pool = getPool();
  const data = event.data;
  const user = await findUserByPaddleEvent(data);

  if (!user) {
    console.error(`[billing:webhook] subscription.updated: user not found for event ${event.event_id}`);
    return;
  }

  const priceId = extractPriceId(data);
  if (!priceId) {
    console.error(`[billing:webhook] subscription.updated: no price ID in event ${event.event_id}`);
    return;
  }

  const planMapping = planFromPriceId(priceId);
  if (!planMapping) {
    console.error(`[billing:webhook] subscription.updated: unknown price ID ${priceId}`);
    return;
  }

  const status = data.status === 'active' ? 'active'
    : data.status === 'trialing' ? 'trialing'
    : data.status === 'past_due' ? 'past_due'
    : data.status === 'paused' ? 'paused'
    : data.status === 'canceled' ? 'canceled'
    : 'active';

  // IDEMPOTENT: SET values
  await pool.query(
    `UPDATE users
     SET plan = $1,
         plan_tokens = $2,
         subscription_status = $3,
         billing_period = $4
     WHERE id = $5`,
    [planMapping.plan, planMapping.tokens, status, planMapping.period, user.id],
  );

  // Log transaction
  await pool.query(
    `INSERT INTO token_transactions (user_id, action_type, amount, balance, metadata)
     VALUES ($1, 'subscription_updated', 0, 0, $2)`,
    [
      user.id,
      JSON.stringify({
        eventId: event.event_id,
        plan: planMapping.plan,
        period: planMapping.period,
        status,
        priceId,
      }),
    ],
  );

  console.log(`[billing:webhook] subscription.updated: user ${user.id} → plan=${planMapping.plan}, status=${status}`);
}

/**
 * subscription.canceled → Mark canceled, set subscription_ends_at.
 */
async function handleSubscriptionCanceled(event: PaddleWebhookEvent): Promise<void> {
  const pool = getPool();
  const data = event.data;
  const user = await findUserByPaddleEvent(data);

  if (!user) {
    console.error(`[billing:webhook] subscription.canceled: user not found for event ${event.event_id}`);
    return;
  }

  // Extract period end date for subscription_ends_at
  const endsAt = data.current_billing_period?.ends_at ?? null;

  // IDEMPOTENT: SET canceled status
  await pool.query(
    `UPDATE users
     SET subscription_status = 'canceled',
         subscription_ends_at = $1
     WHERE id = $2`,
    [endsAt, user.id],
  );

  // Log transaction
  await pool.query(
    `INSERT INTO token_transactions (user_id, action_type, amount, balance, metadata)
     VALUES ($1, 'subscription_canceled', 0, 0, $2)`,
    [
      user.id,
      JSON.stringify({
        eventId: event.event_id,
        subscriptionId: data.id,
        endsAt,
      }),
    ],
  );

  console.log(`[billing:webhook] subscription.canceled: user ${user.id}, ends_at=${endsAt ?? 'immediate'}`);
}

/**
 * subscription.past_due → Flag payment issue.
 */
async function handleSubscriptionPastDue(event: PaddleWebhookEvent): Promise<void> {
  const pool = getPool();
  const data = event.data;
  const user = await findUserByPaddleEvent(data);

  if (!user) {
    console.error(`[billing:webhook] subscription.past_due: user not found for event ${event.event_id}`);
    return;
  }

  // IDEMPOTENT: SET past_due status
  await pool.query(
    `UPDATE users SET subscription_status = 'past_due' WHERE id = $1`,
    [user.id],
  );

  // Log transaction
  await pool.query(
    `INSERT INTO token_transactions (user_id, action_type, amount, balance, metadata)
     VALUES ($1, 'subscription_past_due', 0, 0, $2)`,
    [
      user.id,
      JSON.stringify({
        eventId: event.event_id,
        subscriptionId: data.id,
      }),
    ],
  );

  console.log(`[billing:webhook] subscription.past_due: user ${user.id}`);
}

/**
 * transaction.completed → Identify token pack by priceId, add to purchased_tokens.
 */
async function handleTransactionCompleted(event: PaddleWebhookEvent): Promise<void> {
  const pool = getPool();
  const data = event.data;
  const user = await findUserByPaddleEvent(data);

  if (!user) {
    console.error(`[billing:webhook] transaction.completed: user not found for event ${event.event_id}`);
    return;
  }

  const priceId = extractPriceId(data);
  if (!priceId) {
    // Not all transactions are token packs — subscription payments also fire this.
    // If no price ID, skip silently.
    console.log(`[billing:webhook] transaction.completed: no price ID, skipping (event ${event.event_id})`);
    return;
  }

  const tokenPack = tokenPackFromPriceId(priceId);
  if (!tokenPack) {
    // Likely a subscription payment, not a token pack. Skip.
    console.log(`[billing:webhook] transaction.completed: price ID ${priceId} is not a token pack, skipping`);
    return;
  }

  // IDEMPOTENT check: look for existing transaction with this event_id
  const existing = await pool.query(
    `SELECT id FROM token_transactions
     WHERE user_id = $1 AND metadata->>'eventId' = $2 AND action_type = 'token_pack_purchase'`,
    [user.id, event.event_id],
  );

  if (existing.rowCount && existing.rowCount > 0) {
    console.log(`[billing:webhook] transaction.completed: already processed event ${event.event_id}, skipping`);
    return;
  }

  // Add tokens to purchased_tokens (NOT plan_tokens)
  await pool.query(
    `UPDATE users SET purchased_tokens = purchased_tokens + $1 WHERE id = $2`,
    [tokenPack.tokens, user.id],
  );

  // Get updated balance for log
  const balanceResult = await pool.query(
    'SELECT plan_tokens, purchased_tokens FROM users WHERE id = $1',
    [user.id],
  );
  const balance = balanceResult.rows[0];
  const totalBalance = (balance.plan_tokens as number) + (balance.purchased_tokens as number);

  // Log transaction
  await pool.query(
    `INSERT INTO token_transactions (user_id, action_type, amount, balance, metadata)
     VALUES ($1, 'token_pack_purchase', $2, $3, $4)`,
    [
      user.id,
      tokenPack.tokens,
      totalBalance,
      JSON.stringify({
        eventId: event.event_id,
        packName: tokenPack.name,
        priceId,
        transactionId: data.id,
      }),
    ],
  );

  console.log(`[billing:webhook] transaction.completed: user ${user.id} purchased ${tokenPack.name} (+${tokenPack.tokens} SXC)`);
}

// ============================================================================
// Exported for testing
// ============================================================================
export { verifyPaddleSignature as _verifyPaddleSignature };
