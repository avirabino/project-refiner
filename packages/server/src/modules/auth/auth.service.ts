/**
 * Auth Service — Business Logic
 *
 * Pure business logic for authentication. No Express req/res.
 * Delegates to password.utils.ts and jwt.utils.ts for crypto operations.
 *
 * Sprint 09 scope: registration, login, verification, forgot/reset password, profile.
 * Endpoints are thin route handlers that call into this service.
 */
import { getPool } from '../../db/client.js';
import { hashPassword, verifyPassword } from './password.utils.js';
import {
  generateAccessToken,
  generateRefreshToken,
  generateFingerprint,
} from './jwt.utils.js';
import type { AccessTokenPayload, RefreshTokenData, FingerprintPair } from './jwt.utils.js';
import type { UserRow } from '../../shared/db/schema.js';
import type { RegisterInput, LoginInput, UpdateProfileInput } from './auth.schemas.js';
import { randomBytes } from 'node:crypto';

// ============================================================================
// Types
// ============================================================================

export interface RegisterResult {
  userId: string;
  emailVerified: boolean;
  verificationCode: string; // Returned to service layer for email sending
}

export interface LoginResult {
  accessToken: string;
  refreshToken: RefreshTokenData;
  fingerprint: FingerprintPair;
  user: {
    id: string;
    email: string;
    name: string;
    role: string;
    plan: string;
    products: string[];
    synaptixlabsId: string;
  };
}

export interface UserProfile {
  id: string;
  synaptixlabsId: string;
  email: string;
  name: string;
  image: string | null;
  role: string;
  emailVerified: boolean;
  products: string[];
  plan: string;
  planTokens: number;
  purchasedTokens: number;
  totalTokensUsed: number;
  subscriptionStatus: string;
  billingPeriod: string;
  createdAt: Date;
}

// ============================================================================
// Registration
// ============================================================================

/**
 * Register a new user.
 *
 * 1. Check for duplicate email (409 if exists)
 * 2. Hash password with Argon2id
 * 3. Create user with plan=free, plan_tokens=100, role=user
 * 4. Generate 6-digit verification code (15-min expiry)
 */
export async function register(input: RegisterInput): Promise<RegisterResult> {
  const pool = getPool();

  // Check duplicate email
  const existing = await pool.query(
    'SELECT id FROM users WHERE email = $1',
    [input.email],
  );
  if (existing.rowCount && existing.rowCount > 0) {
    throw new AuthError('EMAIL_EXISTS', 'An account with this email already exists', 409);
  }

  // Hash password with Argon2id (ADR S09-001)
  const passwordHash = await hashPassword(input.password);

  // Generate synaptixlabs_id
  const synaptixlabsId = `sl_${randomBytes(12).toString('hex')}`;

  // Create user
  const result = await pool.query(
    `INSERT INTO users (synaptixlabs_id, email, password_hash, name, role, plan, plan_tokens, products)
     VALUES ($1, $2, $3, $4, 'user', 'free', 100, '["vigil"]'::jsonb)
     RETURNING id`,
    [synaptixlabsId, input.email, passwordHash, input.name],
  );

  const userId = result.rows[0].id as string;

  // Generate 6-digit verification code (15-min expiry)
  const verificationCode = generateVerificationCode();
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

  await pool.query(
    `INSERT INTO email_verification (code, email, user_id, expires_at)
     VALUES ($1, $2, $3, $4)`,
    [verificationCode, input.email, userId, expiresAt],
  );

  return {
    userId,
    emailVerified: false,
    verificationCode,
  };
}

// ============================================================================
// Email Verification
// ============================================================================

/**
 * Verify email with 6-digit code.
 * Marks code as used and sets user.email_verified = true.
 */
export async function verifyEmail(code: string): Promise<{ emailVerified: boolean }> {
  const pool = getPool();

  const result = await pool.query(
    `SELECT id, user_id, expires_at FROM email_verification
     WHERE code = $1 AND used = false
     ORDER BY created_at DESC LIMIT 1`,
    [code],
  );

  if (result.rowCount === 0) {
    throw new AuthError('INVALID_CODE', 'Invalid or expired verification code', 400);
  }

  const row = result.rows[0];
  if (new Date(row.expires_at) < new Date()) {
    throw new AuthError('CODE_EXPIRED', 'Verification code has expired', 400);
  }

  // Mark code as used
  await pool.query('UPDATE email_verification SET used = true WHERE id = $1', [row.id]);

  // Mark user as verified
  await pool.query('UPDATE users SET email_verified = true WHERE id = $1', [row.user_id]);

  return { emailVerified: true };
}

// ============================================================================
// Login
// ============================================================================

/**
 * Authenticate user with email + password.
 *
 * 1. Find user by email
 * 2. Verify Argon2id password
 * 3. Check email verified
 * 4. Generate access JWT + refresh token + fingerprint
 * 5. Update login count + last_login_at
 */
export async function login(input: LoginInput): Promise<LoginResult> {
  const pool = getPool();

  // Find user
  const result = await pool.query(
    `SELECT id, synaptixlabs_id, email, password_hash, name, role, plan, products,
            email_verified, login_count
     FROM users WHERE email = $1`,
    [input.email],
  );

  if (result.rowCount === 0) {
    // Generic error to avoid email enumeration
    throw new AuthError('INVALID_CREDENTIALS', 'Invalid email or password', 401);
  }

  const user = result.rows[0] as Pick<UserRow,
    'id' | 'synaptixlabs_id' | 'email' | 'password_hash' | 'name' | 'role' |
    'plan' | 'products' | 'email_verified' | 'login_count'
  >;

  // Verify password (Argon2id)
  const valid = await verifyPassword(input.password, user.password_hash);
  if (!valid) {
    throw new AuthError('INVALID_CREDENTIALS', 'Invalid email or password', 401);
  }

  // Check email verified
  if (!user.email_verified) {
    throw new AuthError('EMAIL_NOT_VERIFIED', 'Please verify your email before logging in', 403);
  }

  // Generate tokens + fingerprint
  const fingerprint = generateFingerprint();

  const tokenPayload: AccessTokenPayload = {
    sub: user.id,
    email: user.email,
    role: user.role,
    plan: user.plan,
    products: user.products as string[],
    synaptixlabsId: user.synaptixlabs_id,
    fgp: fingerprint.hash,
  };

  const accessToken = generateAccessToken(tokenPayload);
  const refreshToken = generateRefreshToken();

  // Update login count + last_login_at
  await pool.query(
    `UPDATE users SET login_count = login_count + 1, last_login_at = now() WHERE id = $1`,
    [user.id],
  );

  return {
    accessToken,
    refreshToken,
    fingerprint,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      plan: user.plan,
      products: user.products as string[],
      synaptixlabsId: user.synaptixlabs_id,
    },
  };
}

// ============================================================================
// Profile
// ============================================================================

/**
 * Get user profile from DB (not from token — D042).
 */
export async function getProfile(userId: string): Promise<UserProfile> {
  const pool = getPool();

  const result = await pool.query(
    `SELECT id, synaptixlabs_id, email, name, image, role, email_verified,
            products, plan, plan_tokens, purchased_tokens, total_tokens_used,
            subscription_status, billing_period, created_at
     FROM users WHERE id = $1`,
    [userId],
  );

  if (result.rowCount === 0) {
    throw new AuthError('USER_NOT_FOUND', 'User not found', 404);
  }

  const row = result.rows[0];
  return {
    id: row.id,
    synaptixlabsId: row.synaptixlabs_id,
    email: row.email,
    name: row.name,
    image: row.image,
    role: row.role,
    emailVerified: row.email_verified,
    products: row.products,
    plan: row.plan,
    planTokens: row.plan_tokens,
    purchasedTokens: row.purchased_tokens,
    totalTokensUsed: row.total_tokens_used,
    subscriptionStatus: row.subscription_status,
    billingPeriod: row.billing_period,
    createdAt: row.created_at,
  };
}

/**
 * Update user profile (name, image).
 */
export async function updateProfile(
  userId: string,
  input: UpdateProfileInput,
): Promise<UserProfile> {
  const pool = getPool();

  const setClauses: string[] = [];
  const values: unknown[] = [];
  let paramIdx = 1;

  if (input.name !== undefined) {
    setClauses.push(`name = $${paramIdx++}`);
    values.push(input.name);
  }
  if (input.image !== undefined) {
    setClauses.push(`image = $${paramIdx++}`);
    values.push(input.image);
  }

  if (setClauses.length === 0) {
    return getProfile(userId);
  }

  values.push(userId);
  await pool.query(
    `UPDATE users SET ${setClauses.join(', ')} WHERE id = $${paramIdx}`,
    values,
  );

  return getProfile(userId);
}

/**
 * Change password: verify old, hash new, revoke all tokens.
 */
export async function changePassword(
  userId: string,
  oldPassword: string,
  newPassword: string,
): Promise<void> {
  const pool = getPool();

  // Get current hash
  const result = await pool.query(
    'SELECT password_hash FROM users WHERE id = $1',
    [userId],
  );

  if (result.rowCount === 0) {
    throw new AuthError('USER_NOT_FOUND', 'User not found', 404);
  }

  // Verify old password
  const valid = await verifyPassword(oldPassword, result.rows[0].password_hash);
  if (!valid) {
    throw new AuthError('INVALID_PASSWORD', 'Current password is incorrect', 401);
  }

  // Hash new password with Argon2id
  const newHash = await hashPassword(newPassword);
  await pool.query(
    'UPDATE users SET password_hash = $1 WHERE id = $2',
    [newHash, userId],
  );

  // Note: Token revocation will be handled by B06 (revoke all tokens for user)
}

// ============================================================================
// Forgot / Reset Password
// ============================================================================

/**
 * Initiate forgot password flow.
 * Generates a 6-digit reset code and returns it (for email sending).
 * Always succeeds (never reveals if email exists).
 */
export async function forgotPassword(email: string): Promise<{ code: string } | null> {
  const pool = getPool();

  const result = await pool.query(
    'SELECT id FROM users WHERE email = $1',
    [email],
  );

  if (result.rowCount === 0) {
    // Never reveal if email exists — return null silently
    return null;
  }

  const userId = result.rows[0].id as string;
  const code = generateVerificationCode();
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

  await pool.query(
    `INSERT INTO email_verification (code, email, user_id, expires_at)
     VALUES ($1, $2, $3, $4)`,
    [code, email, userId, expiresAt],
  );

  return { code };
}

/**
 * Reset password with verification code.
 * Validates code, hashes new password, updates user, revokes all tokens.
 */
export async function resetPassword(code: string, newPassword: string): Promise<void> {
  const pool = getPool();

  // Find valid code
  const result = await pool.query(
    `SELECT id, user_id, expires_at FROM email_verification
     WHERE code = $1 AND used = false
     ORDER BY created_at DESC LIMIT 1`,
    [code],
  );

  if (result.rowCount === 0) {
    throw new AuthError('INVALID_CODE', 'Invalid or expired reset code', 400);
  }

  const row = result.rows[0];
  if (new Date(row.expires_at) < new Date()) {
    throw new AuthError('CODE_EXPIRED', 'Reset code has expired', 400);
  }

  // Mark code as used
  await pool.query('UPDATE email_verification SET used = true WHERE id = $1', [row.id]);

  // Hash new password with Argon2id and update user
  const newHash = await hashPassword(newPassword);
  await pool.query(
    'UPDATE users SET password_hash = $1 WHERE id = $2',
    [newHash, row.user_id],
  );

  // Note: Token revocation (revoke ALL refresh tokens) handled by B06
}

// ============================================================================
// Token Management (stubs for B05/B06)
// ============================================================================

/**
 * Check if a token hash is revoked.
 */
export async function isTokenRevoked(tokenHash: string): Promise<boolean> {
  const pool = getPool();
  const result = await pool.query(
    'SELECT 1 FROM revoked_tokens WHERE token_hash = $1 AND expires_at > now()',
    [tokenHash],
  );
  return (result.rowCount ?? 0) > 0;
}

/**
 * Revoke a token by storing its hash in the deny list.
 */
export async function revokeToken(tokenHash: string, expiresAt: Date): Promise<void> {
  const pool = getPool();
  await pool.query(
    `INSERT INTO revoked_tokens (token_hash, expires_at)
     VALUES ($1, $2)
     ON CONFLICT (token_hash) DO NOTHING`,
    [tokenHash, expiresAt],
  );
}

/**
 * Clean up expired revoked tokens (garbage collection).
 */
export async function cleanExpiredTokens(): Promise<number> {
  const pool = getPool();
  const result = await pool.query(
    'DELETE FROM revoked_tokens WHERE expires_at < now()',
  );
  return result.rowCount ?? 0;
}

// ============================================================================
// Helpers
// ============================================================================

/** Generate a 6-digit numeric verification code. */
function generateVerificationCode(): string {
  // Crypto-safe random 6-digit code
  const bytes = randomBytes(4);
  const num = bytes.readUInt32BE(0) % 1_000_000;
  return num.toString().padStart(6, '0');
}

// ============================================================================
// Error class
// ============================================================================

export class AuthError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly statusCode: number,
  ) {
    super(message);
    this.name = 'AuthError';
  }
}
