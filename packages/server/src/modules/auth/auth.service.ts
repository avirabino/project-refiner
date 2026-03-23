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
  hashToken,
} from './jwt.utils.js';
import type { AccessTokenPayload, RefreshTokenData, FingerprintPair } from './jwt.utils.js';
import type { UserRow, ProductEnrollment } from '../../shared/db/schema.js';
import type { RegisterInput, LoginInput, UpdateProfileInput, LinkRequestInput, LinkVerifyInput } from './auth.schemas.js';
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
// In-memory rate limiters
// ============================================================================

/** Rate limit entry: timestamps of actions within the window. */
interface RateLimitBucket {
  timestamps: number[];
}

/** In-memory rate limiter store. Keyed by identifier (e.g., IP or email). */
const rateLimitStore = new Map<string, RateLimitBucket>();

/** Periodic cleanup of stale rate limit entries (every 10 minutes). */
const RATE_LIMIT_CLEANUP_INTERVAL = 10 * 60 * 1000;
let _cleanupTimer: ReturnType<typeof setInterval> | null = null;

function ensureRateLimitCleanup(): void {
  if (_cleanupTimer) return;
  _cleanupTimer = setInterval(() => {
    const now = Date.now();
    for (const [key, bucket] of rateLimitStore.entries()) {
      // Remove entries with all timestamps older than 1 hour
      bucket.timestamps = bucket.timestamps.filter((t) => now - t < 3600_000);
      if (bucket.timestamps.length === 0) {
        rateLimitStore.delete(key);
      }
    }
  }, RATE_LIMIT_CLEANUP_INTERVAL);
  // Allow process to exit even if timer is running
  if (_cleanupTimer && typeof _cleanupTimer === 'object' && 'unref' in _cleanupTimer) {
    (_cleanupTimer as NodeJS.Timeout).unref();
  }
}

/**
 * Check and consume a rate limit slot.
 * @param key - Unique identifier (e.g., `register:${ip}` or `resend:${email}`)
 * @param maxAttempts - Maximum allowed attempts within the window
 * @param windowMs - Time window in milliseconds
 * @returns true if allowed, false if rate limited
 */
export function checkRateLimit(key: string, maxAttempts: number, windowMs: number): boolean {
  ensureRateLimitCleanup();
  const now = Date.now();
  let bucket = rateLimitStore.get(key);

  if (!bucket) {
    bucket = { timestamps: [] };
    rateLimitStore.set(key, bucket);
  }

  // Remove timestamps outside the window
  bucket.timestamps = bucket.timestamps.filter((t) => now - t < windowMs);

  if (bucket.timestamps.length >= maxAttempts) {
    return false; // Rate limited
  }

  bucket.timestamps.push(now);
  return true; // Allowed
}

/** Reset rate limit store (for testing). */
export function _resetRateLimits(): void {
  rateLimitStore.clear();
}

// ============================================================================
// Account lockout constants
// ============================================================================

/** Maximum failed login attempts before lockout. */
const MAX_FAILED_ATTEMPTS = 5;

/** Lockout duration in milliseconds (15 minutes). */
const LOCKOUT_DURATION_MS = 15 * 60 * 1000;

// ============================================================================
// Registration (B03)
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

  // Build initial product enrollment
  const enrolledAt = new Date().toISOString();
  const initialEnrollments = JSON.stringify([
    { product: 'vigil', enrolledAt, localPlan: 'free' },
  ]);

  // Create user
  const result = await pool.query(
    `INSERT INTO users (synaptixlabs_id, email, password_hash, name, role, plan, plan_tokens, products, product_enrollments)
     VALUES ($1, $2, $3, $4, 'user', 'free', 100, '["vigil"]'::jsonb, $5::jsonb)
     RETURNING id`,
    [synaptixlabsId, input.email, passwordHash, input.name, initialEnrollments],
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
// Email Verification (B04)
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

/**
 * Resend email verification code.
 * Generates a new 6-digit code (15-min expiry) for the given email.
 * Returns null if the email doesn't exist (never reveal this to the client).
 */
export async function resendVerification(email: string): Promise<{ code: string } | null> {
  const pool = getPool();

  // Look up user
  const userResult = await pool.query(
    'SELECT id, email_verified FROM users WHERE email = $1',
    [email],
  );

  if (userResult.rowCount === 0) {
    // Never reveal if email exists — return null silently
    return null;
  }

  const user = userResult.rows[0];

  // Already verified — no action needed
  if (user.email_verified) {
    return null;
  }

  // Invalidate any existing unused codes for this user
  await pool.query(
    `UPDATE email_verification SET used = true
     WHERE user_id = $1 AND used = false`,
    [user.id],
  );

  // Generate new code
  const code = generateVerificationCode();
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

  await pool.query(
    `INSERT INTO email_verification (code, email, user_id, expires_at)
     VALUES ($1, $2, $3, $4)`,
    [code, email, user.id, expiresAt],
  );

  return { code };
}

// ============================================================================
// Login (B05)
// ============================================================================

/**
 * Authenticate user with email + password.
 *
 * 1. Find user by email
 * 2. Check account lockout (5 failed attempts → 15-min lock)
 * 3. Verify Argon2id password
 * 4. Check email verified
 * 5. Generate access JWT + refresh token + fingerprint
 * 6. Store refresh token hash in DB
 * 7. Lazy SXC renewal (month boundary check)
 * 8. Update login count + last_login_at
 */
export async function login(input: LoginInput): Promise<LoginResult> {
  const pool = getPool();

  // Find user (include lockout fields)
  const result = await pool.query(
    `SELECT id, synaptixlabs_id, email, password_hash, name, role, plan, products,
            email_verified, login_count, failed_login_attempts, locked_until,
            plan_tokens, tokens_renewed_at
     FROM users WHERE email = $1`,
    [input.email],
  );

  if (result.rowCount === 0) {
    // Generic error to avoid email enumeration
    throw new AuthError('INVALID_CREDENTIALS', 'Invalid email or password', 401);
  }

  const user = result.rows[0] as Pick<UserRow,
    'id' | 'synaptixlabs_id' | 'email' | 'password_hash' | 'name' | 'role' |
    'plan' | 'products' | 'email_verified' | 'login_count' |
    'failed_login_attempts' | 'locked_until' | 'plan_tokens' | 'tokens_renewed_at'
  >;

  // Check account lockout
  if (user.locked_until && new Date(user.locked_until) > new Date()) {
    const minutesLeft = Math.ceil(
      (new Date(user.locked_until).getTime() - Date.now()) / 60_000,
    );
    throw new AuthError(
      'ACCOUNT_LOCKED',
      `Account is temporarily locked. Try again in ${minutesLeft} minute(s).`,
      423,
    );
  }

  // If lockout has expired, reset the counter
  if (user.locked_until && new Date(user.locked_until) <= new Date()) {
    await pool.query(
      'UPDATE users SET failed_login_attempts = 0, locked_until = NULL WHERE id = $1',
      [user.id],
    );
    user.failed_login_attempts = 0;
    user.locked_until = null;
  }

  // Verify password (Argon2id)
  const valid = await verifyPassword(input.password, user.password_hash);
  if (!valid) {
    // Increment failed attempts
    const newAttempts = user.failed_login_attempts + 1;

    if (newAttempts >= MAX_FAILED_ATTEMPTS) {
      // Lock the account
      const lockUntil = new Date(Date.now() + LOCKOUT_DURATION_MS);
      await pool.query(
        'UPDATE users SET failed_login_attempts = $1, locked_until = $2 WHERE id = $3',
        [newAttempts, lockUntil, user.id],
      );
      throw new AuthError(
        'ACCOUNT_LOCKED',
        'Too many failed attempts. Account locked for 15 minutes.',
        423,
      );
    } else {
      await pool.query(
        'UPDATE users SET failed_login_attempts = $1 WHERE id = $2',
        [newAttempts, user.id],
      );
    }

    throw new AuthError('INVALID_CREDENTIALS', 'Invalid email or password', 401);
  }

  // Check email verified
  if (!user.email_verified) {
    throw new AuthError('EMAIL_NOT_VERIFIED', 'Please verify your email before logging in', 403);
  }

  // Reset failed attempts on successful login
  if (user.failed_login_attempts > 0) {
    await pool.query(
      'UPDATE users SET failed_login_attempts = 0, locked_until = NULL WHERE id = $1',
      [user.id],
    );
  }

  // Lazy SXC renewal: check if month boundary has been crossed
  await maybeRenewPlanTokens(user.id, user.plan, user.plan_tokens, user.tokens_renewed_at);

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

  // Store refresh token hash in DB
  await storeRefreshToken(user.id, refreshToken);

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
// Refresh Token Storage (B05)
// ============================================================================

/**
 * Store a refresh token hash in the DB for later validation.
 */
export async function storeRefreshToken(userId: string, token: RefreshTokenData): Promise<void> {
  const pool = getPool();
  await pool.query(
    `INSERT INTO refresh_tokens (user_id, token_hash, expires_at)
     VALUES ($1, $2, $3)`,
    [userId, token.tokenHash, token.expiresAt],
  );
}

/**
 * Validate a refresh token hash exists in DB and hasn't expired.
 */
export async function validateRefreshToken(tokenHash: string): Promise<{ userId: string } | null> {
  const pool = getPool();
  const result = await pool.query(
    `SELECT user_id FROM refresh_tokens
     WHERE token_hash = $1 AND expires_at > now()`,
    [tokenHash],
  );

  if (result.rowCount === 0) {
    return null;
  }

  return { userId: result.rows[0].user_id };
}

/**
 * Invalidate a refresh token (remove from active store).
 */
export async function invalidateRefreshToken(tokenHash: string): Promise<void> {
  const pool = getPool();
  await pool.query(
    'DELETE FROM refresh_tokens WHERE token_hash = $1',
    [tokenHash],
  );
}

/**
 * Invalidate all refresh tokens for a user (e.g., on password change).
 */
export async function invalidateAllUserRefreshTokens(userId: string): Promise<void> {
  const pool = getPool();
  await pool.query(
    'DELETE FROM refresh_tokens WHERE user_id = $1',
    [userId],
  );
}

/**
 * Clean up expired refresh tokens (garbage collection).
 */
export async function cleanExpiredRefreshTokens(): Promise<number> {
  const pool = getPool();
  const result = await pool.query(
    'DELETE FROM refresh_tokens WHERE expires_at < now()',
  );
  return result.rowCount ?? 0;
}

// ============================================================================
// Refresh Token Rotation + Logout (B06)
// ============================================================================

/**
 * Refresh access token using a raw refresh token from the cookie.
 *
 * 1. Hash the raw refresh token for DB lookup
 * 2. Validate hash exists in DB and is not expired
 * 3. Invalidate the old refresh token immediately (rotation — ADR S09-001)
 * 4. Load fresh user data from DB (not from stale JWT claims)
 * 5. Generate new access token + new refresh token + new fingerprint
 * 6. Store the new refresh token hash in DB
 */
export async function refreshTokens(rawRefreshToken: string): Promise<LoginResult> {
  const pool = getPool();

  // Hash the raw token for DB lookup
  const oldTokenHash = hashToken(rawRefreshToken);

  // Validate: exists in DB and not expired
  const validToken = await validateRefreshToken(oldTokenHash);
  if (!validToken) {
    throw new AuthError('INVALID_REFRESH_TOKEN', 'Invalid or expired refresh token', 401);
  }

  // Invalidate old refresh token immediately (rotation — ADR S09-001)
  await invalidateRefreshToken(oldTokenHash);

  // Load fresh user data from DB (not from old JWT claims)
  const userResult = await pool.query(
    `SELECT id, synaptixlabs_id, email, name, role, plan, products
     FROM users WHERE id = $1`,
    [validToken.userId],
  );

  if (userResult.rowCount === 0) {
    throw new AuthError('USER_NOT_FOUND', 'User not found', 404);
  }

  const user = userResult.rows[0];

  // Generate new tokens + fingerprint
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
  const newRefreshToken = generateRefreshToken();

  // Store new refresh token hash in DB
  await storeRefreshToken(user.id, newRefreshToken);

  return {
    accessToken,
    refreshToken: newRefreshToken,
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

/**
 * Logout: invalidate the refresh token associated with the raw cookie token.
 * The route handler is responsible for clearing cookies.
 */
export async function logout(rawRefreshToken: string): Promise<void> {
  const oldTokenHash = hashToken(rawRefreshToken);
  await invalidateRefreshToken(oldTokenHash);
}

// ============================================================================
// Lazy SXC Token Renewal (B05)
// ============================================================================

/** Plan token allocations per billing cycle. */
const PLAN_TOKEN_ALLOCATIONS: Record<string, number> = {
  free: 100,
  pro: 1000,
  team: 5000,
  enterprise: 25000,
};

/**
 * Lazy SXC renewal: check if the user's plan tokens should be renewed.
 *
 * If the current month (UTC) is different from the month of `tokens_renewed_at`,
 * reset `plan_tokens` to the plan's allocation and update `tokens_renewed_at`.
 *
 * Called on login to avoid a cron job.
 */
export async function maybeRenewPlanTokens(
  userId: string,
  plan: string,
  _currentTokens: number,
  tokensRenewedAt: Date,
): Promise<boolean> {
  const now = new Date();
  const renewedAt = new Date(tokensRenewedAt);

  // Check if month boundary has been crossed (UTC)
  const sameMonth =
    now.getUTCFullYear() === renewedAt.getUTCFullYear() &&
    now.getUTCMonth() === renewedAt.getUTCMonth();

  if (sameMonth) {
    return false; // No renewal needed
  }

  const allocation = PLAN_TOKEN_ALLOCATIONS[plan] ?? PLAN_TOKEN_ALLOCATIONS.free;

  const pool = getPool();
  await pool.query(
    `UPDATE users SET plan_tokens = $1, tokens_renewed_at = now() WHERE id = $2`,
    [allocation, userId],
  );

  console.log(`[auth] SXC renewal: user ${userId} plan=${plan} tokens reset to ${allocation}`);
  return true;
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

  // Invalidate all refresh tokens for this user
  await invalidateAllUserRefreshTokens(userId);
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

  // Invalidate all refresh tokens for this user (force re-login everywhere)
  await invalidateAllUserRefreshTokens(row.user_id);
}

// ============================================================================
// Token Management (revoked_tokens deny list)
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
// GOD Admin Protection (E04)
// ============================================================================

/** The GOD admin email — immutable, cannot be deleted/downgraded/unlinked. */
export const GOD_ADMIN_EMAIL = 'admin@synaptixlabs.ai';

/**
 * Check if an email belongs to the GOD admin.
 */
export function isGodAdmin(email: string): boolean {
  return email.toLowerCase() === GOD_ADMIN_EMAIL;
}

/**
 * Check if a user ID belongs to the GOD admin.
 */
async function isGodAdminById(userId: string): Promise<boolean> {
  const pool = getPool();
  const result = await pool.query(
    'SELECT email FROM users WHERE id = $1',
    [userId],
  );
  if (result.rowCount === 0) return false;
  return isGodAdmin(result.rows[0].email);
}

/**
 * Delete a user. Rejects if target is GOD admin (E04).
 */
export async function deleteUser(userId: string): Promise<void> {
  if (await isGodAdminById(userId)) {
    throw new AuthError('GOD_ADMIN_IMMUTABLE', 'Cannot delete the GOD admin account', 403);
  }

  const pool = getPool();
  const result = await pool.query('DELETE FROM users WHERE id = $1', [userId]);
  if (result.rowCount === 0) {
    throw new AuthError('USER_NOT_FOUND', 'User not found', 404);
  }
}

/**
 * Update a user's role. Rejects if target is GOD admin (E04).
 */
export async function updateRole(userId: string, newRole: string): Promise<void> {
  if (await isGodAdminById(userId)) {
    throw new AuthError('GOD_ADMIN_IMMUTABLE', 'Cannot change the GOD admin role', 403);
  }

  const pool = getPool();
  await pool.query('UPDATE users SET role = $1 WHERE id = $2', [newRole, userId]);
}

// ============================================================================
// Identity Linking (E02)
// ============================================================================

export interface LinkRequestResult {
  linkCode: string;
  expiresAt: Date;
}

/**
 * Initiate a cross-product identity link request.
 *
 * 1. Generate a 6-digit link code (15-min expiry)
 * 2. Store in email_verification table with type='link'
 * 3. Return code (for email sending or manual entry)
 *
 * The code is associated with the requesting user's Vigil account.
 * The targetProduct + targetEmail identify what is being linked.
 */
export async function linkRequest(
  userId: string,
  input: LinkRequestInput,
): Promise<LinkRequestResult> {
  const pool = getPool();

  // Verify the requesting user exists
  const userResult = await pool.query(
    'SELECT id, email, product_enrollments FROM users WHERE id = $1',
    [userId],
  );
  if (userResult.rowCount === 0) {
    throw new AuthError('USER_NOT_FOUND', 'User not found', 404);
  }

  const user = userResult.rows[0];
  const enrollments = (user.product_enrollments || []) as ProductEnrollment[];

  // Check if already enrolled in this product
  if (enrollments.some((e: ProductEnrollment) => e.product === input.targetProduct)) {
    throw new AuthError('ALREADY_ENROLLED', `Already enrolled in ${input.targetProduct}`, 409);
  }

  // Generate link code
  const linkCode = generateVerificationCode();
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

  await pool.query(
    `INSERT INTO email_verification (code, email, user_id, expires_at, type, target_product)
     VALUES ($1, $2, $3, $4, 'link', $5)`,
    [linkCode, input.targetEmail, userId, expiresAt, input.targetProduct],
  );

  return { linkCode, expiresAt };
}

/**
 * Verify and complete a cross-product identity link.
 *
 * 1. Look up unused link code with type='link'
 * 2. Verify the user's Vigil password (explicit consent — D040)
 * 3. Update product_enrollments + products on the user
 * 4. Mark code as used
 */
export async function linkVerify(
  userId: string,
  input: LinkVerifyInput,
): Promise<{ product: string; synaptixlabsId: string }> {
  const pool = getPool();

  // Find the link code
  const codeResult = await pool.query(
    `SELECT id, user_id, email, expires_at, target_product
     FROM email_verification
     WHERE code = $1 AND type = 'link' AND used = false
     ORDER BY created_at DESC LIMIT 1`,
    [input.code],
  );

  if (codeResult.rowCount === 0) {
    throw new AuthError('INVALID_CODE', 'Invalid or expired link code', 400);
  }

  const codeRow = codeResult.rows[0];

  // Check expiry
  if (new Date(codeRow.expires_at) < new Date()) {
    throw new AuthError('CODE_EXPIRED', 'Link code has expired', 400);
  }

  // The code must belong to the requesting user
  if (codeRow.user_id !== userId) {
    throw new AuthError('INVALID_CODE', 'Link code does not belong to this user', 400);
  }

  // Verify the user's password (explicit consent — D040)
  const userResult = await pool.query(
    'SELECT password_hash, synaptixlabs_id, product_enrollments, products FROM users WHERE id = $1',
    [userId],
  );

  if (userResult.rowCount === 0) {
    throw new AuthError('USER_NOT_FOUND', 'User not found', 404);
  }

  const user = userResult.rows[0];
  const passwordValid = await verifyPassword(input.password, user.password_hash);
  if (!passwordValid) {
    throw new AuthError('INVALID_PASSWORD', 'Password is incorrect', 401);
  }

  // Update product_enrollments
  const enrollments = (user.product_enrollments || []) as ProductEnrollment[];
  const targetProduct = codeRow.target_product as string;

  // Double-check not already enrolled (race condition guard)
  if (enrollments.some((e: ProductEnrollment) => e.product === targetProduct)) {
    throw new AuthError('ALREADY_ENROLLED', `Already enrolled in ${targetProduct}`, 409);
  }

  const newEnrollment: ProductEnrollment = {
    product: targetProduct,
    enrolledAt: new Date().toISOString(),
    localPlan: 'free',
  };

  const updatedEnrollments = [...enrollments, newEnrollment];

  // Update products array (simple string list) and product_enrollments (rich JSONB)
  const products = (user.products || []) as string[];
  const updatedProducts = [...new Set([...products, targetProduct])];

  await pool.query(
    `UPDATE users SET
       product_enrollments = $1::jsonb,
       products = $2::jsonb
     WHERE id = $3`,
    [JSON.stringify(updatedEnrollments), JSON.stringify(updatedProducts), userId],
  );

  // Mark code as used
  await pool.query(
    'UPDATE email_verification SET used = true WHERE id = $1',
    [codeRow.id],
  );

  return {
    product: targetProduct,
    synaptixlabsId: user.synaptixlabs_id,
  };
}

/**
 * Unlink a product from the user's enrollments.
 * Rejects if GOD admin (E04). Cannot unlink 'vigil' (home product).
 */
export async function unlinkProduct(userId: string, product: string): Promise<void> {
  // E04: GOD admin cannot be unlinked
  if (await isGodAdminById(userId)) {
    throw new AuthError('GOD_ADMIN_IMMUTABLE', 'Cannot unlink products from the GOD admin account', 403);
  }

  // Cannot unlink the home product
  if (product === 'vigil') {
    throw new AuthError('CANNOT_UNLINK_HOME', 'Cannot unlink the home product (vigil)', 400);
  }

  const pool = getPool();

  const userResult = await pool.query(
    'SELECT product_enrollments, products FROM users WHERE id = $1',
    [userId],
  );

  if (userResult.rowCount === 0) {
    throw new AuthError('USER_NOT_FOUND', 'User not found', 404);
  }

  const user = userResult.rows[0];
  const enrollments = (user.product_enrollments || []) as ProductEnrollment[];
  const products = (user.products || []) as string[];

  // Filter out the product
  const updatedEnrollments = enrollments.filter((e: ProductEnrollment) => e.product !== product);
  const updatedProducts = products.filter((p: string) => p !== product);

  if (updatedEnrollments.length === enrollments.length) {
    throw new AuthError('NOT_ENROLLED', `Not enrolled in ${product}`, 404);
  }

  await pool.query(
    `UPDATE users SET
       product_enrollments = $1::jsonb,
       products = $2::jsonb
     WHERE id = $3`,
    [JSON.stringify(updatedEnrollments), JSON.stringify(updatedProducts), userId],
  );
}

// ============================================================================
// Enrollment Query (E03)
// ============================================================================

export interface EnrollmentsResult {
  synaptixlabsId: string;
  enrollments: ProductEnrollment[];
}

/**
 * Get the user's cross-product enrollment data.
 * Reads from DB (not JWT).
 */
export async function getEnrollments(userId: string): Promise<EnrollmentsResult> {
  const pool = getPool();

  const result = await pool.query(
    'SELECT synaptixlabs_id, product_enrollments FROM users WHERE id = $1',
    [userId],
  );

  if (result.rowCount === 0) {
    throw new AuthError('USER_NOT_FOUND', 'User not found', 404);
  }

  const row = result.rows[0];
  return {
    synaptixlabsId: row.synaptixlabs_id,
    enrollments: (row.product_enrollments || []) as ProductEnrollment[],
  };
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
