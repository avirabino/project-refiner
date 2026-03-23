/**
 * useAuth Hook — consumes AuthContext
 *
 * Auth state for the dashboard.
 * - Access token in React state (NEVER localStorage) — ADR S09-001
 * - Refresh token handled via HttpOnly cookie (browser sends automatically)
 * - AuthProvider (components/AuthProvider.tsx) wraps entire app
 */

import { createContext, useContext } from 'react';
import type { AuthContextValue } from '../auth.types';

// ── Context (populated by AuthProvider) ──────────────────────────────────────

export const AuthContext = createContext<AuthContextValue | null>(null);

// ── Hook ─────────────────────────────────────────────────────────────────────

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return ctx;
}
