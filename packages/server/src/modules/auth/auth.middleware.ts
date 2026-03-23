/**
 * Auth Middleware — JWT Verification + Role/Plan Guards
 *
 * ADR S09-001:
 * - authMiddleware: extract Bearer token, verify JWT + fingerprint cookie, attach req.user
 * - requireRole(): reject if role insufficient
 * - requirePlan(): reject if plan insufficient — MUST check DB, NOT JWT (D042)
 *
 * JWT claims are CONVENIENCE for UI, not AUTHORITY for access control.
 */
import type { Request, Response, NextFunction } from 'express';
import { verifyAccessToken, hashFingerprint } from './jwt.utils.js';
import type { DecodedAccessToken } from './jwt.utils.js';
import { getPool } from '../../db/client.js';
import type { UserRole, UserPlan } from '../../shared/db/schema.js';

// ============================================================================
// Extend Express Request with user context
// ============================================================================

/** User context attached to authenticated requests. */
export interface AuthUser {
  id: string;
  email: string;
  role: string;
  plan: string;
  products: string[];
  synaptixlabsId: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

// ============================================================================
// Role hierarchy for comparison
// ============================================================================

const ROLE_HIERARCHY: Record<string, number> = {
  user: 0,
  admin: 1,
  super_admin: 2,
};

const PLAN_HIERARCHY: Record<string, number> = {
  free: 0,
  pro: 1,
  team: 2,
  enterprise: 3,
};

// ============================================================================
// Middleware functions
// ============================================================================

/**
 * Core auth middleware.
 *
 * 1. Extract Bearer token from Authorization header
 * 2. Verify JWT signature + expiry
 * 3. Verify fingerprint cookie matches JWT `fgp` claim
 * 4. Attach user to req.user
 */
export function authMiddleware(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Missing or invalid authorization header' });
    return;
  }

  const token = authHeader.slice(7);
  if (!token) {
    res.status(401).json({ error: 'Missing access token' });
    return;
  }

  let decoded: DecodedAccessToken;
  try {
    decoded = verifyAccessToken(token);
  } catch {
    res.status(401).json({ error: 'Invalid or expired access token' });
    return;
  }

  // Verify fingerprint cookie matches JWT claim (sidejacking defense)
  const fingerprintCookie = extractCookie(req, '__Secure-Fgp');
  if (decoded.fgp && fingerprintCookie) {
    const expectedHash = hashFingerprint(fingerprintCookie);
    if (expectedHash !== decoded.fgp) {
      res.status(401).json({ error: 'Fingerprint mismatch' });
      return;
    }
  }

  // Attach convenience user context from JWT
  req.user = {
    id: decoded.sub,
    email: decoded.email,
    role: decoded.role,
    plan: decoded.plan,
    products: decoded.products,
    synaptixlabsId: decoded.synaptixlabsId,
  };

  next();
}

/**
 * Role guard middleware factory.
 *
 * Checks JWT role claim against required minimum role.
 * Uses role hierarchy: user < admin < super_admin.
 *
 * @param minRole - Minimum required role
 */
export function requireRole(minRole: UserRole) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    const userLevel = ROLE_HIERARCHY[req.user.role] ?? 0;
    const requiredLevel = ROLE_HIERARCHY[minRole] ?? 0;

    if (userLevel < requiredLevel) {
      res.status(403).json({ error: 'Insufficient permissions' });
      return;
    }

    next();
  };
}

/**
 * Plan guard middleware factory.
 *
 * CRITICAL (D042): This MUST check the database, NOT the JWT claim.
 * JWT claims are convenience for UI — plan changes (upgrade/downgrade)
 * must take effect immediately, not after token refresh.
 *
 * @param minPlan - Minimum required plan
 */
export function requirePlan(minPlan: UserPlan) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    try {
      // D042: ALWAYS check DB for plan — never trust JWT
      const pool = getPool();
      const result = await pool.query(
        'SELECT plan FROM users WHERE id = $1',
        [req.user.id],
      );

      if (result.rowCount === 0) {
        res.status(401).json({ error: 'User not found' });
        return;
      }

      const dbPlan = result.rows[0].plan as string;
      const userLevel = PLAN_HIERARCHY[dbPlan] ?? 0;
      const requiredLevel = PLAN_HIERARCHY[minPlan] ?? 0;

      if (userLevel < requiredLevel) {
        res.status(403).json({
          error: 'Plan upgrade required',
          currentPlan: dbPlan,
          requiredPlan: minPlan,
        });
        return;
      }

      // Update req.user.plan with DB value (in case JWT is stale)
      req.user.plan = dbPlan;
      next();
    } catch (err) {
      console.error('[auth:requirePlan] DB check failed:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  };
}

// ============================================================================
// Helpers
// ============================================================================

/**
 * Extract a cookie value from the request.
 * Parses the Cookie header manually (avoids cookie-parser dependency).
 */
function extractCookie(req: Request, name: string): string | undefined {
  const cookieHeader = req.headers.cookie;
  if (!cookieHeader) return undefined;

  const cookies = cookieHeader.split(';');
  for (const cookie of cookies) {
    const [key, ...rest] = cookie.trim().split('=');
    if (key === name) {
      return rest.join('=');
    }
  }
  return undefined;
}
