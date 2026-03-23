/**
 * JWT Utilities — Token Generation & Verification
 *
 * ADR S09-001:
 * - Access token: 15-min expiry, HS256 (RS256 in future), stored in JS memory
 * - Refresh token: 7-day expiry, opaque (not JWT), stored in HttpOnly cookie
 * - Fingerprint: random value in HttpOnly cookie, SHA-256 hash in JWT claim
 * - Rotation: new refresh on every use, old invalidated immediately
 *
 * JWT claims are CONVENIENCE, not AUTHORITY.
 * Plan/role gates MUST re-validate from DB (D042).
 */
import jwt from 'jsonwebtoken';
import { randomBytes, createHash } from 'node:crypto';

// ============================================================================
// Configuration
// ============================================================================

/** Access token expiry: 15 minutes (per ADR S09-001 + OWASP 2025). */
const ACCESS_TOKEN_EXPIRY = '15m';

/** Refresh token expiry: 7 days. */
const REFRESH_TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days in ms

/** Refresh token byte length (32 bytes = 64 hex chars). */
const REFRESH_TOKEN_BYTES = 32;

/** Fingerprint byte length (32 bytes). */
const FINGERPRINT_BYTES = 32;

function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET environment variable is not set');
  }
  return secret;
}

// ============================================================================
// Types
// ============================================================================

/** JWT access token payload (convenience claims — NOT authority). */
export interface AccessTokenPayload {
  /** User ID (subject). */
  sub: string;
  /** User email. */
  email: string;
  /** User role (convenience — re-validate from DB for sensitive ops). */
  role: string;
  /** User plan (convenience — re-validate from DB for sensitive ops). */
  plan: string;
  /** Products the user has access to (convenience). */
  products: string[];
  /** SynaptixLabs platform ID. */
  synaptixlabsId: string;
  /** SHA-256 hash of the fingerprint cookie (sidejacking defense). */
  fgp: string;
}

/** Decoded access token (includes standard JWT claims). */
export interface DecodedAccessToken extends AccessTokenPayload {
  iat: number;
  exp: number;
}

/** Refresh token data. */
export interface RefreshTokenData {
  /** Opaque token value (hex string). */
  token: string;
  /** SHA-256 hash of the token (for storage/lookup). */
  tokenHash: string;
  /** Expiration timestamp. */
  expiresAt: Date;
}

/** Fingerprint pair (value + hash). */
export interface FingerprintPair {
  /** Raw fingerprint value (stored in HttpOnly cookie). */
  value: string;
  /** SHA-256 hash of the value (stored in JWT claim). */
  hash: string;
}

// ============================================================================
// Access Token Functions
// ============================================================================

/**
 * Generate a signed JWT access token (HS256, 15-min expiry).
 *
 * Claims are convenience for UI rendering only.
 * Any operation that gates on plan/role/billing MUST re-validate from DB.
 */
export function generateAccessToken(payload: AccessTokenPayload): string {
  return jwt.sign(payload, getJwtSecret(), {
    algorithm: 'HS256',
    expiresIn: ACCESS_TOKEN_EXPIRY,
  });
}

/**
 * Verify and decode a JWT access token.
 *
 * @throws If token is expired, invalid, or tampered with
 */
export function verifyAccessToken(token: string): DecodedAccessToken {
  return jwt.verify(token, getJwtSecret(), {
    algorithms: ['HS256'],
  }) as DecodedAccessToken;
}

// ============================================================================
// Refresh Token Functions
// ============================================================================

/**
 * Generate an opaque refresh token (not a JWT).
 *
 * Returns the raw token (for cookie), its SHA-256 hash (for DB storage),
 * and its expiration timestamp.
 */
export function generateRefreshToken(): RefreshTokenData {
  const token = randomBytes(REFRESH_TOKEN_BYTES).toString('hex');
  const tokenHash = hashToken(token);
  const expiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL_MS);

  return { token, tokenHash, expiresAt };
}

/**
 * Hash a token with SHA-256 (for storage/comparison).
 * Used for both refresh tokens and revoked token lookup.
 */
export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

// ============================================================================
// Fingerprint Functions
// ============================================================================

/**
 * Generate a random fingerprint and its SHA-256 hash.
 *
 * The raw value goes into an HttpOnly cookie.
 * The hash goes into the JWT access token `fgp` claim.
 * On each request, the middleware re-hashes the cookie and compares to the JWT claim.
 * This prevents token sidejacking (stolen JWT without the cookie is useless).
 */
export function generateFingerprint(): FingerprintPair {
  const value = randomBytes(FINGERPRINT_BYTES).toString('hex');
  const hash = hashFingerprint(value);
  return { value, hash };
}

/**
 * Hash a fingerprint value with SHA-256.
 * Used by middleware to re-derive and compare against JWT `fgp` claim.
 */
export function hashFingerprint(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

// ============================================================================
// Constants (exported for middleware / service use)
// ============================================================================

/** Refresh token TTL in milliseconds (7 days). */
export const REFRESH_TOKEN_TTL = REFRESH_TOKEN_TTL_MS;
