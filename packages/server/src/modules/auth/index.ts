/**
 * Auth Module — Public Exports
 *
 * Only import from this barrel file. Internal files are private.
 * See README.md for module documentation.
 */

// Routes
export { authRouter } from './auth.routes.js';

// Middleware
export { authMiddleware, requireRole, requirePlan } from './auth.middleware.js';
export type { AuthUser } from './auth.middleware.js';

// Service (for other modules that need auth operations)
export { AuthError } from './auth.service.js';
export type { RegisterResult, LoginResult, UserProfile } from './auth.service.js';

// Password utils (for seed scripts)
export { hashPassword, verifyPassword } from './password.utils.js';

// JWT utils (for other modules that need token operations)
export {
  generateAccessToken,
  verifyAccessToken,
  generateRefreshToken,
  generateFingerprint,
  hashFingerprint,
  hashToken,
  REFRESH_TOKEN_TTL,
} from './jwt.utils.js';
export type {
  AccessTokenPayload,
  DecodedAccessToken,
  RefreshTokenData,
  FingerprintPair,
} from './jwt.utils.js';

// Schemas (for client-side validation reuse)
export {
  registerSchema,
  loginSchema,
  verifyEmailSchema,
  resendVerificationSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  changePasswordSchema,
  updateProfileSchema,
} from './auth.schemas.js';
export type {
  RegisterInput,
  LoginInput,
  VerifyEmailInput,
  ResendVerificationInput,
  ForgotPasswordInput,
  ResetPasswordInput,
  ChangePasswordInput,
  UpdateProfileInput,
} from './auth.schemas.js';
