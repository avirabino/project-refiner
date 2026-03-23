# Auth Module

## Purpose

Authentication and authorization for vigil-server. Handles user registration, login, email verification, password management, JWT token lifecycle, and route protection via middleware.

**Authoritative spec:** `docs/sprints/sprint_09/specs/ADR_S09_001_AUTH_STACK.md`

## Owner

`[DEV:server]` — Server Team

## Public API

### Routes (`authRouter`)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | /api/auth/register | Public | Create account (Argon2id hash, verification code) |
| POST | /api/auth/login | Public | Email+password login, returns JWT + refresh cookie |
| POST | /api/auth/verify-email | Public | 6-digit code email verification |
| POST | /api/auth/forgot-password | Public | Request password reset code |
| POST | /api/auth/reset-password | Public | Reset password with code |
| POST | /api/auth/logout | Bearer | Revoke refresh token, clear cookies |
| GET | /api/auth/profile | Bearer | Get user profile (from DB, not token) |
| PUT | /api/auth/profile | Bearer | Update name/image |
| POST | /api/auth/change-password | Bearer | Change password (requires old password) |

### Middleware

```typescript
import { authMiddleware, requireRole, requirePlan } from './modules/auth/index.js';

// Protect a route — verifies JWT + fingerprint
router.get('/protected', authMiddleware, handler);

// Require admin role
router.get('/admin', authMiddleware, requireRole('admin'), handler);

// Require pro plan — checks DB, NOT JWT (D042)
router.get('/pro-feature', authMiddleware, requirePlan('pro'), handler);
```

### Password Utils

```typescript
import { hashPassword, verifyPassword } from './modules/auth/index.js';

const hash = await hashPassword('plaintext');     // Argon2id
const valid = await verifyPassword('plaintext', hash); // timing-safe
```

### JWT Utils

```typescript
import {
  generateAccessToken,
  verifyAccessToken,
  generateRefreshToken,
  generateFingerprint,
} from './modules/auth/index.js';
```

## Dependencies

| Module | Purpose |
|--------|---------|
| `../../db/client.js` | Neon PostgreSQL pool |
| `../../shared/db/schema.js` | TypeScript type definitions |
| `argon2` | Argon2id password hashing (ADR S09-001) |
| `jsonwebtoken` | JWT sign/verify (HS256) |
| `zod` | Input validation schemas |

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | Neon PostgreSQL connection string |
| `JWT_SECRET` | Yes | Secret for HS256 JWT signing (min 32 chars recommended) |
| `NODE_ENV` | No | Set to `production` for Secure cookie flag |

## File Structure

```
modules/auth/
  README.md              # This file
  index.ts               # Public barrel exports
  auth.routes.ts         # Express route handlers (thin)
  auth.service.ts        # Business logic (no req/res)
  auth.schemas.ts        # Zod validation schemas
  auth.middleware.ts      # JWT verify + role/plan guards
  password.utils.ts      # Argon2id hash + verify
  jwt.utils.ts           # Token generation + verification
```

## Key Design Decisions

1. **Argon2id ONLY** — No bcrypt (ADR S09-001). Parameters: memoryCost=19456, timeCost=2, parallelism=1.
2. **JWT claims are convenience** — Plan/role gates MUST re-validate from DB (D042). `requirePlan()` always does a DB query.
3. **Fingerprint defense** — Random cookie value, SHA-256 hash in JWT. Middleware verifies match to prevent token sidejacking.
4. **Opaque refresh tokens** — Not JWTs. 32 random bytes, stored as SHA-256 hash in DB.
5. **No Google OAuth in Sprint 09** — Email+password only. OAuth deferred to Sprint 10.

## Testing

```bash
npx vitest run modules/auth/
```

## Changelog

| Sprint | Change |
|--------|--------|
| 09 | Initial implementation — full auth system |
