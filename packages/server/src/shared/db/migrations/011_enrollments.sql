-- ============================================================================
-- Migration 011: Product Enrollments + Link Codes (Sprint 09 — Track E)
-- Adds product_enrollments JSONB column to users table.
-- Adds type + target_product columns to email_verification for link codes.
-- ============================================================================

-- 1. Add product_enrollments JSONB column to users (richer than products[])
--    Format: [{ "product": "vigil", "enrolledAt": "ISO", "localPlan": "free" }]
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'product_enrollments'
  ) THEN
    ALTER TABLE users ADD COLUMN product_enrollments JSONB NOT NULL DEFAULT '[]'::jsonb;
  END IF;
END $$;

-- 2. Backfill product_enrollments from existing users (only rows with empty enrollments)
UPDATE users
SET product_enrollments = jsonb_build_array(
  jsonb_build_object(
    'product', 'vigil',
    'enrolledAt', to_char(created_at, 'YYYY-MM-DD"T"HH24:MI:SS"Z"'),
    'localPlan', plan
  )
)
WHERE product_enrollments = '[]'::jsonb;

-- 3. Add type column to email_verification for distinguishing link codes
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'email_verification' AND column_name = 'type'
  ) THEN
    ALTER TABLE email_verification ADD COLUMN type TEXT NOT NULL DEFAULT 'verify'
      CHECK (type IN ('verify', 'reset', 'link'));
  END IF;
END $$;

-- 4. Add target_product column to email_verification (for link codes)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'email_verification' AND column_name = 'target_product'
  ) THEN
    ALTER TABLE email_verification ADD COLUMN target_product TEXT;
  END IF;
END $$;

-- 5. Index for link code lookups
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_email_verification_link_code') THEN
    CREATE INDEX idx_email_verification_link_code
      ON email_verification (code, type) WHERE used = false AND type = 'link';
  END IF;
END $$;
