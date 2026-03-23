/**
 * Auth API — calls to /api/auth/* endpoints
 *
 * Uses apiClient for authenticated requests, raw fetch for public auth routes.
 * ADR S09-001 route contract.
 */

import { apiClient } from '../../shared/api/client';
import type {
  LoginRequest,
  LoginResponse,
  RegisterRequest,
  RegisterResponse,
  VerifyEmailRequest,
  VerifyEmailResponse,
  ForgotPasswordRequest,
  ForgotPasswordResponse,
  ResetPasswordRequest,
  ResetPasswordResponse,
  RefreshResponse,
  ChangePasswordRequest,
  ChangePasswordResponse,
  ResendVerificationRequest,
  ResendVerificationResponse,
  ProfileResponse,
} from './auth.types';

const AUTH_BASE = '/api/auth';

// ── Public routes (no Bearer token needed) ───────────────────────────────────

export async function loginApi(data: LoginRequest): Promise<LoginResponse> {
  return apiClient<LoginResponse>(`${AUTH_BASE}/login`, {
    method: 'POST',
    body: JSON.stringify(data),
    skipAuth: true,
  });
}

export async function registerApi(data: RegisterRequest): Promise<RegisterResponse> {
  return apiClient<RegisterResponse>(`${AUTH_BASE}/register`, {
    method: 'POST',
    body: JSON.stringify(data),
    skipAuth: true,
  });
}

export async function verifyEmailApi(data: VerifyEmailRequest): Promise<VerifyEmailResponse> {
  return apiClient<VerifyEmailResponse>(`${AUTH_BASE}/verify-email`, {
    method: 'POST',
    body: JSON.stringify(data),
    skipAuth: true,
  });
}

export async function resendVerificationApi(data: ResendVerificationRequest): Promise<ResendVerificationResponse> {
  return apiClient<ResendVerificationResponse>(`${AUTH_BASE}/resend-verification`, {
    method: 'POST',
    body: JSON.stringify(data),
    skipAuth: true,
  });
}

export async function refreshTokenApi(): Promise<RefreshResponse> {
  return apiClient<RefreshResponse>(`${AUTH_BASE}/refresh`, {
    method: 'POST',
    skipAuth: true, // Uses HttpOnly cookie, not Bearer
  });
}

export async function forgotPasswordApi(data: ForgotPasswordRequest): Promise<ForgotPasswordResponse> {
  return apiClient<ForgotPasswordResponse>(`${AUTH_BASE}/forgot-password`, {
    method: 'POST',
    body: JSON.stringify(data),
    skipAuth: true,
  });
}

export async function resetPasswordApi(data: ResetPasswordRequest): Promise<ResetPasswordResponse> {
  return apiClient<ResetPasswordResponse>(`${AUTH_BASE}/reset-password`, {
    method: 'POST',
    body: JSON.stringify(data),
    skipAuth: true,
  });
}

// ── Authenticated routes ─────────────────────────────────────────────────────

export async function logoutApi(): Promise<void> {
  await apiClient<{ message: string }>(`${AUTH_BASE}/logout`, {
    method: 'POST',
  });
}

export async function getProfileApi(): Promise<ProfileResponse> {
  return apiClient<ProfileResponse>(`${AUTH_BASE}/profile`);
}

export async function changePasswordApi(data: ChangePasswordRequest): Promise<ChangePasswordResponse> {
  return apiClient<ChangePasswordResponse>(`${AUTH_BASE}/change-password`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}
