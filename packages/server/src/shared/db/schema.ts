/**
 * Database Schema — Single Source of Truth
 *
 * All table definitions for vigil-server live here.
 * Migration SQL files reference these definitions.
 * No schema definitions elsewhere. (S09-ARCH-01 Section 4)
 *
 * Sprint 09: Auth tables (users, email_verification, revoked_tokens)
 */

// ============================================================================
// Existing tables (Sprint 06-07) — documented for completeness
// ============================================================================

/**
 * Projects table — root of the data tree.
 * Projects -> Sessions -> (Bugs, Features)
 */
export interface ProjectRow {
  id: string;
  name: string;
  description: string | null;
  current_sprint: string | null;
  url: string | null;
  created_at: Date;
  updated_at: Date;
  archived_at: Date | null;
}

export interface SessionRow {
  id: string;
  name: string;
  project_id: string;
  started_at: number;
  ended_at: number | null;
  clock: number;
  recordings: unknown; // JSONB
  snapshots: unknown;  // JSONB
  bugs: unknown;       // JSONB
  features: unknown;   // JSONB
  annotations: unknown; // JSONB
  sprint: string | null;
  description: string | null;
  created_at: Date;
  archived_at: Date | null;
}

export interface BugRow {
  id: string;
  title: string;
  status: string;
  severity: string;
  sprint: string;
  discovered: string | null;
  steps_to_reproduce: string | null;
  expected: string | null;
  actual: string | null;
  url: string | null;
  regression_test: string | null;
  regression_test_status: string;
  resolution: string | null;
  session_id: string;
  created_at: Date;
  updated_at: Date;
  archived_at: Date | null;
}

export interface FeatureRow {
  id: string;
  title: string;
  status: string;
  priority: string;
  sprint: string;
  discovered: string | null;
  description: string | null;
  url: string | null;
  session_id: string;
  created_at: Date;
  updated_at: Date;
  archived_at: Date | null;
}

// ============================================================================
// Sprint 09: Auth tables
// ============================================================================

/** User roles — super_admin is immutable (GOD admin only). */
export type UserRole = 'user' | 'admin' | 'super_admin';

/** Subscription plans. */
export type UserPlan = 'free' | 'pro' | 'team' | 'enterprise';

/** Paddle subscription states. */
export type SubscriptionStatus =
  | 'active'
  | 'trialing'
  | 'past_due'
  | 'paused'
  | 'canceled'
  | 'none';

/** Paddle billing period. */
export type BillingPeriod = 'monthly' | 'yearly' | 'none';

/**
 * Users table — auth, profile, billing, and platform fields.
 *
 * Fields sourced from:
 * - ADR S09-001 (auth stack freeze)
 * - Production launch spec (billing + platform fields)
 * - Track B TODO (B01 details)
 */
export interface UserRow {
  /** Primary key — internal UUID (gen_random_uuid). */
  id: string;
  /** Platform-wide SynaptixLabs ID (sl_xxx format). */
  synaptixlabs_id: string;
  /** User email — unique, lowercase, max 320 chars. */
  email: string;
  /** Argon2id password hash. */
  password_hash: string;
  /** Display name. */
  name: string;
  /** Profile image URL. */
  image: string | null;
  /** Role: user | admin | super_admin. */
  role: UserRole;
  /** Whether email has been verified. */
  email_verified: boolean;
  /** Products the user has access to (JSONB array, e.g. ["vigil"]). */
  products: string[];
  /** Subscription plan. */
  plan: UserPlan;
  /** Monthly plan token allocation (SXC). */
  plan_tokens: number;
  /** One-time purchased tokens (SXC). */
  purchased_tokens: number;
  /** Lifetime total tokens consumed. */
  total_tokens_used: number;
  /** When plan tokens were last renewed (month boundary). */
  tokens_renewed_at: Date;
  /** Paddle customer ID. */
  paddle_customer_id: string | null;
  /** Paddle subscription ID. */
  paddle_subscription_id: string | null;
  /** Paddle subscription status. */
  subscription_status: SubscriptionStatus;
  /** When subscription ends (cancel/expiry). */
  subscription_ends_at: Date | null;
  /** Billing period: monthly | yearly | none. */
  billing_period: BillingPeriod;
  /** Total login count. */
  login_count: number;
  /** Last successful login timestamp. */
  last_login_at: Date | null;
  /** Account creation timestamp. */
  created_at: Date;
  /** Last profile/data update timestamp. */
  updated_at: Date;
}

/**
 * Email verification codes.
 * 6-digit code, 15-min expiry, single use.
 */
export interface EmailVerificationRow {
  /** Primary key — UUID. */
  id: string;
  /** 6-digit verification code. */
  code: string;
  /** Target email address. */
  email: string;
  /** FK to users.id. */
  user_id: string;
  /** Code expiration timestamp. */
  expires_at: Date;
  /** Whether this code has been consumed. */
  used: boolean;
  /** When the code was created. */
  created_at: Date;
}

/**
 * Revoked tokens (deny list).
 * Stores SHA-256 hash of revoked refresh tokens.
 * TTL = token expiry for automatic cleanup.
 */
export interface RevokedTokenRow {
  /** Primary key — UUID. */
  id: string;
  /** SHA-256 hash of the token. */
  token_hash: string;
  /** When this revocation entry expires (matches token expiry). */
  expires_at: Date;
  /** When the token was revoked. */
  created_at: Date;
}
