/**
 * Auth Zod Validation Schemas
 *
 * All input validation for auth endpoints.
 * Spec: ADR S09-001, S09-ARCH-01 Section 2.2
 *
 * Rules:
 * - Email: format validation, max 320 chars, forced lowercase
 * - Password: 8-128 chars
 * - Name: 1-100 chars, trimmed
 */
import { z } from 'zod';

// ============================================================================
// Shared field schemas
// ============================================================================

const emailField = z
  .string()
  .email('Invalid email address')
  .max(320, 'Email must not exceed 320 characters')
  .transform((v) => v.toLowerCase().trim());

const passwordField = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(128, 'Password must not exceed 128 characters');

const nameField = z
  .string()
  .min(1, 'Name is required')
  .max(100, 'Name must not exceed 100 characters')
  .transform((v) => v.trim());

const verificationCodeField = z
  .string()
  .length(6, 'Verification code must be 6 digits')
  .regex(/^\d{6}$/, 'Verification code must be 6 digits');

// ============================================================================
// Request schemas
// ============================================================================

/** POST /api/auth/register */
export const registerSchema = z.object({
  email: emailField,
  password: passwordField,
  name: nameField,
});
export type RegisterInput = z.infer<typeof registerSchema>;

/** POST /api/auth/login */
export const loginSchema = z.object({
  email: emailField,
  password: passwordField,
});
export type LoginInput = z.infer<typeof loginSchema>;

/** POST /api/auth/verify-email */
export const verifyEmailSchema = z.object({
  code: verificationCodeField,
});
export type VerifyEmailInput = z.infer<typeof verifyEmailSchema>;

/** POST /api/auth/resend-verification */
export const resendVerificationSchema = z.object({
  email: emailField,
});
export type ResendVerificationInput = z.infer<typeof resendVerificationSchema>;

/** POST /api/auth/forgot-password */
export const forgotPasswordSchema = z.object({
  email: emailField,
});
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;

/** POST /api/auth/reset-password */
export const resetPasswordSchema = z.object({
  code: verificationCodeField,
  newPassword: passwordField,
});
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;

/** POST /api/auth/change-password */
export const changePasswordSchema = z.object({
  oldPassword: passwordField,
  newPassword: passwordField,
});
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;

/** PUT /api/auth/profile */
export const updateProfileSchema = z.object({
  name: nameField.optional(),
  image: z
    .string()
    .url('Image must be a valid URL')
    .max(2048, 'Image URL must not exceed 2048 characters')
    .optional()
    .nullable(),
});
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;

// ============================================================================
// Track E — Identity linking + enrollment schemas (Sprint 09)
// ============================================================================

/** Product name field — lowercase identifier. */
const productField = z
  .string()
  .min(1, 'Product name is required')
  .max(50, 'Product name must not exceed 50 characters')
  .regex(/^[a-z][a-z0-9_-]*$/, 'Product must be lowercase alphanumeric (with hyphens/underscores)')
  .transform((v) => v.toLowerCase().trim());

/** POST /api/auth/link-request */
export const linkRequestSchema = z.object({
  targetProduct: productField,
  targetEmail: emailField,
});
export type LinkRequestInput = z.infer<typeof linkRequestSchema>;

/** POST /api/auth/link-verify */
export const linkVerifySchema = z.object({
  code: verificationCodeField,
  password: passwordField,
});
export type LinkVerifyInput = z.infer<typeof linkVerifySchema>;

/** POST /api/auth/unlink */
export const unlinkProductSchema = z.object({
  product: productField,
});
export type UnlinkProductInput = z.infer<typeof unlinkProductSchema>;
