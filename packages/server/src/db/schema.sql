-- Vigil PostgreSQL Schema (Neon)
-- Run via: tsx packages/server/src/db/migrate.ts
--
-- Data hierarchy (enforced by FK constraints):
--   Projects -> Sessions -> (Bugs, Features)
--   Deleting a project cascades to sessions, which cascades to bugs/features.

-- Projects (root of the tree)
CREATE TABLE IF NOT EXISTS projects (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  current_sprint TEXT,
  url TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Sprints
CREATE TABLE IF NOT EXISTS sprints (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Bug counter sequence
CREATE SEQUENCE IF NOT EXISTS bug_counter START 1;

-- Feature counter sequence
CREATE SEQUENCE IF NOT EXISTS feature_counter START 1;

-- Sessions (must belong to a project — FK CASCADE)
CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  started_at BIGINT NOT NULL,
  ended_at BIGINT,
  clock INTEGER DEFAULT 0,
  recordings JSONB DEFAULT '[]'::jsonb,
  snapshots JSONB DEFAULT '[]'::jsonb,
  bugs JSONB DEFAULT '[]'::jsonb,
  features JSONB DEFAULT '[]'::jsonb,
  annotations JSONB DEFAULT '[]'::jsonb,
  sprint TEXT,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Bugs (must belong to a session — FK CASCADE)
CREATE TABLE IF NOT EXISTS bugs (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'OPEN',
  severity TEXT NOT NULL DEFAULT 'P2',
  sprint TEXT NOT NULL,
  discovered TEXT,
  steps_to_reproduce TEXT,
  expected TEXT,
  actual TEXT,
  url TEXT,
  regression_test TEXT,
  regression_test_status TEXT DEFAULT '⬜',
  resolution TEXT,
  session_id TEXT NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Features (must belong to a session — FK CASCADE)
CREATE TABLE IF NOT EXISTS features (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'OPEN',
  priority TEXT NOT NULL DEFAULT 'ENHANCEMENT',
  sprint TEXT NOT NULL,
  discovered TEXT,
  description TEXT,
  url TEXT,
  session_id TEXT NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Sprint 07: Add annotations column if missing (migration for existing DBs)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'sessions' AND column_name = 'annotations'
  ) THEN
    ALTER TABLE sessions ADD COLUMN annotations JSONB DEFAULT '[]'::jsonb;
  END IF;
END $$;

-- ============================================================================
-- Sprint 07: Enforce tree integrity on EXISTING databases
-- Clean orphaned data, then add FK constraints + NOT NULL.
-- These blocks are idempotent — safe to re-run on every migration.
-- ============================================================================

-- 1. Remove orphaned bugs/features with NULL session_id
DELETE FROM bugs WHERE session_id IS NULL;
DELETE FROM features WHERE session_id IS NULL;

-- 2. Remove orphaned bugs/features whose session no longer exists
DELETE FROM bugs WHERE session_id IS NOT NULL AND session_id NOT IN (SELECT id FROM sessions);
DELETE FROM features WHERE session_id IS NOT NULL AND session_id NOT IN (SELECT id FROM sessions);

-- 3. Remove orphaned sessions whose project no longer exists
DELETE FROM sessions WHERE project_id IS NOT NULL AND project_id NOT IN (SELECT id FROM projects);

-- 4. Make session_id NOT NULL on bugs (idempotent)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'bugs' AND column_name = 'session_id' AND is_nullable = 'YES'
  ) THEN
    ALTER TABLE bugs ALTER COLUMN session_id SET NOT NULL;
  END IF;
END $$;

-- 5. Make session_id NOT NULL on features (idempotent)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'features' AND column_name = 'session_id' AND is_nullable = 'YES'
  ) THEN
    ALTER TABLE features ALTER COLUMN session_id SET NOT NULL;
  END IF;
END $$;

-- 6. FK: sessions.project_id -> projects.id ON DELETE CASCADE
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'fk_sessions_project'
  ) THEN
    ALTER TABLE sessions
      ADD CONSTRAINT fk_sessions_project
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE;
  END IF;
END $$;

-- 7. FK: bugs.session_id -> sessions.id ON DELETE CASCADE
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'fk_bugs_session'
  ) THEN
    ALTER TABLE bugs
      ADD CONSTRAINT fk_bugs_session
      FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE;
  END IF;
END $$;

-- 8. FK: features.session_id -> sessions.id ON DELETE CASCADE
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'fk_features_session'
  ) THEN
    ALTER TABLE features
      ADD CONSTRAINT fk_features_session
      FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Updated_at triggers
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'bugs_updated_at'
  ) THEN
    CREATE TRIGGER bugs_updated_at
      BEFORE UPDATE ON bugs
      FOR EACH ROW EXECUTE FUNCTION update_updated_at();
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'features_updated_at'
  ) THEN
    CREATE TRIGGER features_updated_at
      BEFORE UPDATE ON features
      FOR EACH ROW EXECUTE FUNCTION update_updated_at();
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'projects_updated_at'
  ) THEN
    CREATE TRIGGER projects_updated_at
      BEFORE UPDATE ON projects
      FOR EACH ROW EXECUTE FUNCTION update_updated_at();
  END IF;
END $$;

-- ============================================================================
-- Sprint 07: Soft-delete / Archive support
-- Add archived_at column to all 4 entity tables (idempotent).
-- NULL = active, non-NULL = archived timestamp.
-- ============================================================================

-- 1. projects.archived_at
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'projects' AND column_name = 'archived_at'
  ) THEN
    ALTER TABLE projects ADD COLUMN archived_at TIMESTAMPTZ NULL;
  END IF;
END $$;

-- 2. sessions.archived_at
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'sessions' AND column_name = 'archived_at'
  ) THEN
    ALTER TABLE sessions ADD COLUMN archived_at TIMESTAMPTZ NULL;
  END IF;
END $$;

-- 3. bugs.archived_at
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'bugs' AND column_name = 'archived_at'
  ) THEN
    ALTER TABLE bugs ADD COLUMN archived_at TIMESTAMPTZ NULL;
  END IF;
END $$;

-- 4. features.archived_at
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'features' AND column_name = 'archived_at'
  ) THEN
    ALTER TABLE features ADD COLUMN archived_at TIMESTAMPTZ NULL;
  END IF;
END $$;

-- Partial indexes: efficient queries for default (non-archived) view
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_projects_active') THEN
    CREATE INDEX idx_projects_active ON projects (name) WHERE archived_at IS NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_sessions_active') THEN
    CREATE INDEX idx_sessions_active ON sessions (started_at) WHERE archived_at IS NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_bugs_active') THEN
    CREATE INDEX idx_bugs_active ON bugs (id) WHERE archived_at IS NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_features_active') THEN
    CREATE INDEX idx_features_active ON features (id) WHERE archived_at IS NULL;
  END IF;
END $$;

-- ============================================================================
-- Sprint 09: Auth System Tables
-- See: shared/db/migrations/009_auth.sql (authoritative)
-- See: shared/db/schema.ts (TypeScript types)
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

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_revoked_tokens_hash') THEN
    CREATE UNIQUE INDEX idx_revoked_tokens_hash ON revoked_tokens (token_hash);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_revoked_tokens_expires') THEN
    CREATE INDEX idx_revoked_tokens_expires ON revoked_tokens (expires_at);
  END IF;
END $$;

-- GOD admin protection: Prevent role changes on super_admin accounts
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
