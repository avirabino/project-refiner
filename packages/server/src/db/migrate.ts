/**
 * Run schema.sql against the Neon database.
 * Usage: DATABASE_URL=... tsx packages/server/src/db/migrate.ts
 */
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { getPool, isDatabaseConfigured } from './client.js';

async function migrate(): Promise<void> {
  if (!isDatabaseConfigured()) {
    console.error('[migrate] DATABASE_URL is not set. Aborting.');
    process.exit(1);
  }

  const schemaPath = resolve(import.meta.dirname, 'schema.sql');
  const sql = await readFile(schemaPath, 'utf8');

  console.log('[migrate] Running schema against Neon...');
  const pool = getPool();
  await pool.query(sql);
  console.log('[migrate] Schema applied successfully.');
  await pool.end();
}

migrate().catch((err) => {
  console.error('[migrate] Failed:', err);
  process.exit(1);
});
