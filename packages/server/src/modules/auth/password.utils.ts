/**
 * Password Utilities — Argon2id ONLY
 *
 * ADR S09-001: "Algorithm: Argon2id — ONLY. No bcrypt anywhere in Sprint 09."
 * Parameters: memoryCost=19456 (19 MiB), timeCost=2, parallelism=1
 * Library: `argon2` npm package (Node.js binding to reference C implementation)
 */
import argon2 from 'argon2';

/** Argon2id parameters per ADR S09-001 + OWASP 2025 */
const ARGON2_OPTIONS: argon2.Options & { raw?: false } = {
  type: argon2.argon2id,
  memoryCost: 19_456, // 19 MiB
  timeCost: 2,
  parallelism: 1,
};

/**
 * Hash a plaintext password with Argon2id.
 *
 * @param plain - Plaintext password (8-128 chars, enforced by Zod schema)
 * @returns Argon2id hash string (includes algorithm, params, salt, and hash)
 */
export async function hashPassword(plain: string): Promise<string> {
  return argon2.hash(plain, ARGON2_OPTIONS);
}

/**
 * Verify a plaintext password against an Argon2id hash.
 * Uses timing-safe comparison internally (provided by libargon2).
 *
 * @param plain - Plaintext password to verify
 * @param hash - Argon2id hash from the database
 * @returns true if the password matches, false otherwise
 */
export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  try {
    return await argon2.verify(hash, plain);
  } catch {
    // Invalid hash format or other error — treat as mismatch
    return false;
  }
}
