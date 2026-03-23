-- ============================================================================
-- Migration 010: Billing System (Sprint 09)
-- Tables: token_transactions, promo_codes, promo_code_redemptions
-- Spec: SPRINT_09_SPEC_production_launch.md §4
-- Track: C (SXC + Paddle Billing)
-- ============================================================================

-- 1. Token transactions audit log
-- Records every SXC credit/debit for full audit trail.
CREATE TABLE IF NOT EXISTS token_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  action_type TEXT NOT NULL,
  -- Positive = credit (purchase, promo, renewal), Negative = debit (consumption)
  amount INTEGER NOT NULL,
  -- Balance AFTER this transaction
  balance INTEGER NOT NULL,
  -- Optional: linked article/entity ID
  article_id TEXT,
  -- Flexible metadata (event IDs, pack names, promo codes, etc.)
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for token_transactions
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_token_transactions_user') THEN
    CREATE INDEX idx_token_transactions_user ON token_transactions (user_id, created_at DESC);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_token_transactions_action') THEN
    CREATE INDEX idx_token_transactions_action ON token_transactions (action_type);
  END IF;
END $$;


-- 2. Promo codes table
CREATE TABLE IF NOT EXISTS promo_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  token_amount INTEGER NOT NULL,
  max_uses INTEGER,             -- NULL = unlimited
  used_count INTEGER NOT NULL DEFAULT 0,
  expires_at TIMESTAMPTZ,       -- NULL = never expires
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for promo code lookup (case-insensitive via UPPER)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_promo_codes_code_upper') THEN
    CREATE UNIQUE INDEX idx_promo_codes_code_upper ON promo_codes (UPPER(code));
  END IF;
END $$;


-- 3. Promo code redemptions (tracks who redeemed what)
CREATE TABLE IF NOT EXISTS promo_code_redemptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  promo_code_id UUID NOT NULL REFERENCES promo_codes(id) ON DELETE CASCADE,
  redeemed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Unique constraint: each user can redeem a given code only once
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_promo_redemptions_unique') THEN
    CREATE UNIQUE INDEX idx_promo_redemptions_unique ON promo_code_redemptions (user_id, promo_code_id);
  END IF;
END $$;


-- ============================================================================
-- Seed data: sample promo codes for testing (idempotent)
-- ============================================================================
INSERT INTO promo_codes (code, token_amount, max_uses, expires_at)
VALUES
  ('VIGIL-LAUNCH-100', 100, 500, '2027-01-01T00:00:00Z'),
  ('BETA-TESTER-50', 50, 100, '2026-12-31T00:00:00Z'),
  ('SYNAPTIX-VIP', 500, 10, NULL)
ON CONFLICT (code) DO NOTHING;
