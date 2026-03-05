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
