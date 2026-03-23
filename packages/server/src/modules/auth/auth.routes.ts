/**
 * Auth Routes — /api/auth/*
 *
 * Thin route handlers that delegate to auth.service.ts.
 * All input validation via Zod schemas from auth.schemas.ts.
 *
 * Route contract from ADR S09-001:
 *
 * PUBLIC:
 *   POST /api/auth/register
 *   POST /api/auth/login
 *   POST /api/auth/verify-email
 *   POST /api/auth/resend-verification
 *   POST /api/auth/refresh
 *   POST /api/auth/forgot-password
 *   POST /api/auth/reset-password
 *
 * AUTHENTICATED:
 *   POST /api/auth/logout
 *   GET  /api/auth/profile
 *   PUT  /api/auth/profile
 *   POST /api/auth/change-password
 *   POST /api/auth/link-request      (Track E — identity linking)
 *   POST /api/auth/link-verify       (Track E — identity linking)
 *   POST /api/auth/unlink            (Track E — identity unlinking)
 *   GET  /api/auth/enrollments       (Track E — enrollment query)
 */
import { Router } from 'express';
import type { Request, Response } from 'express';
import {
  registerSchema,
  loginSchema,
  verifyEmailSchema,
  resendVerificationSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  changePasswordSchema,
  updateProfileSchema,
  linkRequestSchema,
  linkVerifySchema,
  unlinkProductSchema,
} from './auth.schemas.js';
import {
  register,
  login,
  verifyEmail,
  resendVerification,
  forgotPassword,
  resetPassword,
  changePassword,
  getProfile,
  updateProfile,
  refreshTokens,
  logout,
  linkRequest,
  linkVerify,
  unlinkProduct,
  getEnrollments,
  checkRateLimit,
  AuthError,
} from './auth.service.js';
import { authMiddleware } from './auth.middleware.js';
import { REFRESH_TOKEN_TTL } from './jwt.utils.js';
import { ZodError } from 'zod';

export const authRouter = Router();

// ============================================================================
// Rate limit constants
// ============================================================================

/** 5 registrations per IP per hour. */
const REGISTER_RATE_LIMIT = 5;
const REGISTER_RATE_WINDOW = 60 * 60 * 1000; // 1 hour

/** 3 resend-verification per email per hour. */
const RESEND_RATE_LIMIT = 3;
const RESEND_RATE_WINDOW = 60 * 60 * 1000; // 1 hour

/** 3 forgot-password per email per hour (B07). */
const FORGOT_PASSWORD_RATE_LIMIT = 3;
const FORGOT_PASSWORD_RATE_WINDOW = 60 * 60 * 1000; // 1 hour

// ============================================================================
// Helpers
// ============================================================================

/** Get client IP from request (X-Forwarded-For or socket). */
function getClientIp(req: Request): string {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string') {
    return forwarded.split(',')[0].trim();
  }
  return req.socket.remoteAddress ?? 'unknown';
}

/** Extract a cookie value from the request (manual parse, avoids cookie-parser). */
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

// ============================================================================
// PUBLIC routes
// ============================================================================

/** POST /api/auth/register */
authRouter.post('/register', async (req: Request, res: Response) => {
  try {
    // Rate limit: 5 registrations per IP per hour
    const ip = getClientIp(req);
    if (!checkRateLimit(`register:${ip}`, REGISTER_RATE_LIMIT, REGISTER_RATE_WINDOW)) {
      res.status(429).json({ error: 'Too many registration attempts. Try again later.' });
      return;
    }

    const input = registerSchema.parse(req.body);
    const result = await register(input);
    // Note: verificationCode would be sent via Resend (email service)
    // For now, we log it (Sprint 09 — email integration TBD)
    console.log(`[auth] Verification code for ${input.email}: ${result.verificationCode}`);
    res.status(201).json({
      userId: result.userId,
      emailVerified: result.emailVerified,
    });
  } catch (err) {
    handleAuthError(res, err);
  }
});

/** POST /api/auth/login */
authRouter.post('/login', async (req: Request, res: Response) => {
  try {
    const input = loginSchema.parse(req.body);
    const result = await login(input);

    // Set refresh token cookie (HttpOnly, Secure, SameSite=Strict)
    res.cookie('refreshToken', result.refreshToken.token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/api/auth',
      maxAge: REFRESH_TOKEN_TTL,
    });

    // Set fingerprint cookie (HttpOnly, Secure, SameSite=Strict)
    res.cookie('__Secure-Fgp', result.fingerprint.value, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/',
      maxAge: REFRESH_TOKEN_TTL,
    });

    res.json({
      accessToken: result.accessToken,
      user: result.user,
    });
  } catch (err) {
    handleAuthError(res, err);
  }
});

/** POST /api/auth/verify-email */
authRouter.post('/verify-email', async (req: Request, res: Response) => {
  try {
    const input = verifyEmailSchema.parse(req.body);
    const result = await verifyEmail(input.code);
    res.json(result);
  } catch (err) {
    handleAuthError(res, err);
  }
});

/** POST /api/auth/resend-verification */
authRouter.post('/resend-verification', async (req: Request, res: Response) => {
  try {
    const input = resendVerificationSchema.parse(req.body);

    // Rate limit: 3 resend per email per hour
    if (!checkRateLimit(`resend:${input.email}`, RESEND_RATE_LIMIT, RESEND_RATE_WINDOW)) {
      res.status(429).json({ error: 'Too many verification requests. Try again later.' });
      return;
    }

    const result = await resendVerification(input.email);
    if (result) {
      // Note: code would be sent via Resend (email service)
      console.log(`[auth] Resend verification code for ${input.email}: ${result.code}`);
    }
    // Always return 200 — never reveal if email exists or is already verified
    res.json({ message: 'If an unverified account with that email exists, a new code has been sent.' });
  } catch (err) {
    handleAuthError(res, err);
  }
});

/** POST /api/auth/refresh (B06 — public, uses cookie not Bearer token) */
authRouter.post('/refresh', async (req: Request, res: Response) => {
  try {
    // Extract refresh token from cookie
    const rawRefreshToken = extractCookie(req, 'refreshToken');
    if (!rawRefreshToken) {
      res.status(401).json({ error: 'Missing refresh token', code: 'MISSING_REFRESH_TOKEN' });
      return;
    }

    const result = await refreshTokens(rawRefreshToken);

    // Set new refresh token cookie (rotation — old one was invalidated by service)
    res.cookie('refreshToken', result.refreshToken.token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/api/auth',
      maxAge: REFRESH_TOKEN_TTL,
    });

    // Set new fingerprint cookie
    res.cookie('__Secure-Fgp', result.fingerprint.value, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/',
      maxAge: REFRESH_TOKEN_TTL,
    });

    res.json({
      accessToken: result.accessToken,
      user: result.user,
    });
  } catch (err) {
    handleAuthError(res, err);
  }
});

/** POST /api/auth/forgot-password (B07 — rate limited 3/hour/email) */
authRouter.post('/forgot-password', async (req: Request, res: Response) => {
  try {
    const input = forgotPasswordSchema.parse(req.body);

    // Rate limit: 3 forgot-password per email per hour (B07)
    if (!checkRateLimit(`forgot:${input.email}`, FORGOT_PASSWORD_RATE_LIMIT, FORGOT_PASSWORD_RATE_WINDOW)) {
      // Still return 200 to avoid revealing whether email exists
      res.json({ message: 'If an account with that email exists, a reset code has been sent.' });
      return;
    }

    const result = await forgotPassword(input.email);
    if (result) {
      // Note: code would be sent via Resend (email service deferred)
      console.log(`[auth] Reset code for ${input.email}: ${result.code}`);
    }
    // Always return 200 — never reveal if email exists
    res.json({ message: 'If an account with that email exists, a reset code has been sent.' });
  } catch (err) {
    handleAuthError(res, err);
  }
});

/** POST /api/auth/reset-password */
authRouter.post('/reset-password', async (req: Request, res: Response) => {
  try {
    const input = resetPasswordSchema.parse(req.body);
    await resetPassword(input.code, input.newPassword);
    res.json({ message: 'Password reset. Please log in.' });
  } catch (err) {
    handleAuthError(res, err);
  }
});

// ============================================================================
// AUTHENTICATED routes
// ============================================================================

/** POST /api/auth/logout (B06 — authenticated, revokes refresh token) */
authRouter.post('/logout', authMiddleware, async (req: Request, res: Response) => {
  try {
    // Revoke the refresh token if present in the cookie
    const rawRefreshToken = extractCookie(req, 'refreshToken');
    if (rawRefreshToken) {
      await logout(rawRefreshToken);
    }

    // Clear cookies
    res.clearCookie('refreshToken', { path: '/api/auth' });
    res.clearCookie('__Secure-Fgp', { path: '/' });
    res.json({ message: 'Logged out' });
  } catch (err) {
    handleAuthError(res, err);
  }
});

/** GET /api/auth/profile */
authRouter.get('/profile', authMiddleware, async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }
    const profile = await getProfile(req.user.id);
    res.json(profile);
  } catch (err) {
    handleAuthError(res, err);
  }
});

/** PUT /api/auth/profile */
authRouter.put('/profile', authMiddleware, async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }
    const input = updateProfileSchema.parse(req.body);
    const profile = await updateProfile(req.user.id, input);
    res.json(profile);
  } catch (err) {
    handleAuthError(res, err);
  }
});

/** POST /api/auth/change-password */
authRouter.post('/change-password', authMiddleware, async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }
    const input = changePasswordSchema.parse(req.body);
    await changePassword(req.user.id, input.oldPassword, input.newPassword);
    // Clear cookies (force re-login)
    res.clearCookie('refreshToken', { path: '/api/auth' });
    res.clearCookie('__Secure-Fgp', { path: '/' });
    res.json({ message: 'Password changed. Please log in again.' });
  } catch (err) {
    handleAuthError(res, err);
  }
});

// ============================================================================
// Track E — Identity linking + enrollment routes (Sprint 09)
// ============================================================================

/** POST /api/auth/link-request (E02 — initiate cross-product link) */
authRouter.post('/link-request', authMiddleware, async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }
    const input = linkRequestSchema.parse(req.body);
    const result = await linkRequest(req.user.id, input);
    // Note: linkCode would be sent via Resend (email service deferred)
    console.log(`[auth] Link code for ${req.user.email} → ${input.targetProduct}: ${result.linkCode}`);
    res.status(201).json({
      message: 'Link code generated. Check your email or use the code directly.',
      expiresAt: result.expiresAt,
    });
  } catch (err) {
    handleAuthError(res, err);
  }
});

/** POST /api/auth/link-verify (E02 — confirm link with password) */
authRouter.post('/link-verify', authMiddleware, async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }
    const input = linkVerifySchema.parse(req.body);
    const result = await linkVerify(req.user.id, input);
    res.json({
      message: `Successfully linked to ${result.product}`,
      product: result.product,
      synaptixlabsId: result.synaptixlabsId,
    });
  } catch (err) {
    handleAuthError(res, err);
  }
});

/** POST /api/auth/unlink (E02 — remove a product enrollment) */
authRouter.post('/unlink', authMiddleware, async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }
    const input = unlinkProductSchema.parse(req.body);
    await unlinkProduct(req.user.id, input.product);
    res.json({ message: `Unlinked from ${input.product}` });
  } catch (err) {
    handleAuthError(res, err);
  }
});

/** GET /api/auth/enrollments (E03 — query cross-product enrollments) */
authRouter.get('/enrollments', authMiddleware, async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }
    const result = await getEnrollments(req.user.id);
    res.json(result);
  } catch (err) {
    handleAuthError(res, err);
  }
});

// ============================================================================
// Error handler
// ============================================================================

function handleAuthError(res: Response, err: unknown): void {
  if (err instanceof AuthError) {
    res.status(err.statusCode).json({
      error: err.message,
      code: err.code,
    });
    return;
  }

  if (err instanceof ZodError) {
    res.status(400).json({
      error: 'Validation failed',
      details: err.errors.map((e) => ({
        field: e.path.join('.'),
        message: e.message,
      })),
    });
    return;
  }

  console.error('[auth] Unexpected error:', err);
  res.status(500).json({ error: 'Internal server error' });
}
