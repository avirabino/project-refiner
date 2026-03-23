/**
 * Seed GOD admin account for Sprint 09.
 *
 * Creates the immutable super_admin: admin@synaptixlabs.ai
 * Password: "VigilAdmin!2026" (Argon2id hashed)
 *
 * Usage: DATABASE_URL=... tsx packages/server/src/shared/db/migrations/009_auth_seed.ts
 * Safe to re-run (uses ON CONFLICT DO NOTHING).
 */
import { config as loadEnv } from 'dotenv';
import { resolve } from 'node:path';

// Load .env from project root
loadEnv({ path: resolve(import.meta.dirname, '..', '..', '..', '..', '..', '.env') });

import { getPool, isDatabaseConfigured } from '../../../db/client.js';
import { hashPassword } from '../../../modules/auth/password.utils.js';

const GOD_ADMIN = {
  email: 'admin@synaptixlabs.ai',
  password: 'VigilAdmin!2026',
  name: 'SynaptixLabs Admin',
  role: 'super_admin' as const,
  synaptixlabs_id: 'sl_god_admin_001',
};

async function seedGodAdmin(): Promise<void> {
  if (!isDatabaseConfigured()) {
    console.error('[seed:god-admin] DATABASE_URL is not set. Aborting.');
    process.exit(1);
  }

  const pool = getPool();

  console.log('[seed:god-admin] Hashing password with Argon2id...');
  const passwordHash = await hashPassword(GOD_ADMIN.password);

  console.log('[seed:god-admin] Inserting GOD admin...');
  const result = await pool.query(
    `INSERT INTO users (
      synaptixlabs_id, email, password_hash, name, role,
      email_verified, products, plan, plan_tokens
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    ON CONFLICT (email) DO NOTHING
    RETURNING id`,
    [
      GOD_ADMIN.synaptixlabs_id,
      GOD_ADMIN.email,
      passwordHash,
      GOD_ADMIN.name,
      GOD_ADMIN.role,
      true,                           // email_verified
      JSON.stringify(['vigil']),      // products
      'enterprise',                   // plan
      999999,                         // plan_tokens (unlimited)
    ],
  );

  if (result.rowCount && result.rowCount > 0) {
    console.log(`[seed:god-admin] Created GOD admin: ${GOD_ADMIN.email} (id: ${result.rows[0].id})`);
  } else {
    console.log(`[seed:god-admin] GOD admin already exists: ${GOD_ADMIN.email}`);
  }

  await pool.end();
  console.log('[seed:god-admin] Done.');
}

seedGodAdmin().catch((err) => {
  console.error('[seed:god-admin] Failed:', err);
  process.exit(1);
});
