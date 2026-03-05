import { neon } from '@neondatabase/serverless';
import dotenv from 'dotenv';
dotenv.config({ path: 'C:/Synaptix-Labs/projects/vigil/.env' });

const sql = neon(process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL);

async function migrate() {
  // Check current state
  const cols = await sql`
    SELECT table_name, column_name
    FROM information_schema.columns
    WHERE column_name = 'archived_at'
    AND table_name IN ('projects', 'sessions', 'bugs', 'features')
    ORDER BY table_name
  `;
  console.log('Current archived_at columns:', cols.map(c => c.table_name));

  // Add to projects (might already exist)
  try {
    await sql`ALTER TABLE projects ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ NULL`;
    console.log('✅ projects.archived_at added');
  } catch(e) { console.log('projects:', e.message); }

  // Add to sessions
  try {
    await sql`ALTER TABLE sessions ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ NULL`;
    console.log('✅ sessions.archived_at added');
  } catch(e) { console.log('sessions:', e.message); }

  // Add to bugs
  try {
    await sql`ALTER TABLE bugs ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ NULL`;
    console.log('✅ bugs.archived_at added');
  } catch(e) { console.log('bugs:', e.message); }

  // Add to features
  try {
    await sql`ALTER TABLE features ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ NULL`;
    console.log('✅ features.archived_at added');
  } catch(e) { console.log('features:', e.message); }

  // Create partial indexes (idempotent)
  try {
    await sql`CREATE INDEX IF NOT EXISTS idx_projects_active ON projects (name) WHERE archived_at IS NULL`;
    await sql`CREATE INDEX IF NOT EXISTS idx_sessions_active ON sessions (started_at) WHERE archived_at IS NULL`;
    await sql`CREATE INDEX IF NOT EXISTS idx_bugs_active ON bugs (id) WHERE archived_at IS NULL`;
    await sql`CREATE INDEX IF NOT EXISTS idx_features_active ON features (id) WHERE archived_at IS NULL`;
    console.log('✅ Partial indexes created');
  } catch(e) { console.log('indexes:', e.message); }

  // Verify
  const after = await sql`
    SELECT table_name, column_name
    FROM information_schema.columns
    WHERE column_name = 'archived_at'
    AND table_name IN ('projects', 'sessions', 'bugs', 'features')
    ORDER BY table_name
  `;
  console.log('After migration:', after.map(c => c.table_name));
}

migrate().catch(console.error);
