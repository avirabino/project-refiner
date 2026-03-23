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
 *   POST /api/auth/refresh
 *   POST /api/auth/forgot-password
 *   POST /api/auth/reset-password
 *
 * AUTHENTICATED:
 *   POST /api/auth/logout
 *   GET  /api/auth/profile
 *   PUT  /api/auth/profile
 *   POST /api/auth/change-password
 */
import { Router } from 'express';
import type { Request, Response } from 'express';
import {
  registerSchema,
  loginSchema,
  verifyEmailSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  changePasswordSchema,
  updateProfileSchema,
} from './auth.schemas.js';
import {
  register,
  login,
  verifyEmail,
  forgotPassword,
  resetPassword,
  changePassword,
  getProfile,
  updateProfile,
  AuthError,
} from './auth.service.js';
import { authMiddleware } from './auth.middleware.js';
import { REFRESH_TOKEN_TTL } from './jwt.utils.js';
import { ZodError } from 'zod';

export const authRouter = Router();

// ============================================================================
// PUBLIC routes
// ============================================================================

/** POST /api/auth/register */
authRouter.post('/register', async (req: Request, res: Response) => {
  try {
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

/** POST /api/auth/forgot-password */
authRouter.post('/forgot-password', async (req: Request, res: Response) => {
  try {
    const input = forgotPasswordSchema.parse(req.body);
    const result = await forgotPassword(input.email);
    if (result) {
      // Note: code would be sent via Resend (email service)
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

/** POST /api/auth/logout */
authRouter.post('/logout', authMiddleware, async (_req: Request, res: Response) => {
  // Clear cookies
  res.clearCookie('refreshToken', { path: '/api/auth' });
  res.clearCookie('__Secure-Fgp', { path: '/' });
  // Note: Token revocation (B06) will add the refresh token to the deny list
  res.json({ message: 'Logged out' });
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
