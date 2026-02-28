-- Vigil PostgreSQL Schema (Neon)
-- Run via: tsx packages/server/src/db/migrate.ts

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

-- Bugs
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
  session_id TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Features
CREATE TABLE IF NOT EXISTS features (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'OPEN',
  priority TEXT NOT NULL DEFAULT 'ENHANCEMENT',
  sprint TEXT NOT NULL,
  discovered TEXT,
  description TEXT,
  url TEXT,
  session_id TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Sessions (JSONB for recordings/snapshots)
CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  project_id TEXT NOT NULL,
  started_at BIGINT NOT NULL,
  ended_at BIGINT,
  clock INTEGER DEFAULT 0,
  recordings JSONB DEFAULT '[]'::jsonb,
  snapshots JSONB DEFAULT '[]'::jsonb,
  bugs JSONB DEFAULT '[]'::jsonb,
  features JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now()
);

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
