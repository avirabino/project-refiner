-- ============================================================================
-- Migration 009: Auth System (Sprint 09)
-- Tables: users, email_verification, revoked_tokens
-- Spec: ADR S09-001 (Auth Stack Freeze)
-- ============================================================================

-- 1. Users table
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  synaptixlabs_id TEXT NOT NULL UNIQUE,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  name TEXT NOT NULL,
  image TEXT,
  role TEXT NOT NULL DEFAULT 'user'
    CHECK (role IN ('user', 'admin', 'super_admin')),
  email_verified BOOLEAN NOT NULL DEFAULT false,
  products JSONB NOT NULL DEFAULT '["vigil"]'::jsonb,

  -- Billing / SXC
  plan TEXT NOT NULL DEFAULT 'free'
    CHECK (plan IN ('free', 'pro', 'team', 'enterprise')),
  plan_tokens INTEGER NOT NULL DEFAULT 100,
  purchased_tokens INTEGER NOT NULL DEFAULT 0,
  total_tokens_used INTEGER NOT NULL DEFAULT 0,
  tokens_renewed_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Paddle
  paddle_customer_id TEXT,
  paddle_subscription_id TEXT,
  subscription_status TEXT NOT NULL DEFAULT 'none'
    CHECK (subscription_status IN ('active', 'trialing', 'past_due', 'paused', 'canceled', 'none')),
  subscription_ends_at TIMESTAMPTZ,
  billing_period TEXT NOT NULL DEFAULT 'none'
    CHECK (billing_period IN ('monthly', 'yearly', 'none')),

  -- Activity tracking
  login_count INTEGER NOT NULL DEFAULT 0,
  last_login_at TIMESTAMPTZ,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for users
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_users_email') THEN
    CREATE UNIQUE INDEX idx_users_email ON users (email);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_users_synaptixlabs_id') THEN
    CREATE UNIQUE INDEX idx_users_synaptixlabs_id ON users (synaptixlabs_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_users_paddle_customer') THEN
    CREATE INDEX idx_users_paddle_customer ON users (paddle_customer_id) WHERE paddle_customer_id IS NOT NULL;
  END IF;
END $$;

-- Updated_at trigger for users
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'users_updated_at'
  ) THEN
    CREATE TRIGGER users_updated_at
      BEFORE UPDATE ON users
      FOR EACH ROW EXECUTE FUNCTION update_updated_at();
  END IF;
END $$;


-- 2. Email verification table
CREATE TABLE IF NOT EXISTS email_verification (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL,
  email TEXT NOT NULL,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at TIMESTAMPTZ NOT NULL,
  used BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for email_verification
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_email_verification_code') THEN
    CREATE INDEX idx_email_verification_code ON email_verification (code, email) WHERE used = false;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_email_verification_user') THEN
    CREATE INDEX idx_email_verification_user ON email_verification (user_id);
  END IF;
END $$;


-- 3. Revoked tokens table (deny list)
CREATE TABLE IF NOT EXISTS revoked_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token_hash TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for revoked_tokens lookup
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_revoked_tokens_hash') THEN
    CREATE UNIQUE INDEX idx_revoked_tokens_hash ON revoked_tokens (token_hash);
  END IF;
  -- Index for TTL cleanup: find expired entries efficiently
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_revoked_tokens_expires') THEN
    CREATE INDEX idx_revoked_tokens_expires ON revoked_tokens (expires_at);
  END IF;
END $$;

-- ============================================================================
-- GOD admin protection: Prevent role changes on super_admin accounts
-- ============================================================================
CREATE OR REPLACE FUNCTION protect_super_admin()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.role = 'super_admin' AND NEW.role != 'super_admin' THEN
    RAISE EXCEPTION 'Cannot demote super_admin account (GOD admin is immutable)';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'protect_super_admin_trigger'
  ) THEN
    CREATE TRIGGER protect_super_admin_trigger
      BEFORE UPDATE ON users
      FOR EACH ROW EXECUTE FUNCTION protect_super_admin();
  END IF;
END $$;
