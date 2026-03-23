/**
 * AuthProvider — wraps the app with auth context
 *
 * - Access token stored in React state (NEVER localStorage) — ADR S09-001
 * - On mount: attempts silent refresh via HttpOnly cookie
 * - Sets up API client refresh handler for automatic 401 retry
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import type { ReactNode } from 'react';
import { setAccessToken, setRefreshHandler } from '../../../shared/api/client';
import { loginApi, registerApi, logoutApi, refreshTokenApi } from '../auth.api';
import { AuthContext } from '../hooks/useAuth';
import type { AuthUser, AuthContextValue, LoginRequest, RegisterRequest, RegisterResponse } from '../auth.types';

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const mountedRef = useRef(true);

  const isAuthenticated = user !== null;

  // ── Refresh token ──────────────────────────────────────────────────────────
  const refreshToken = useCallback(async (): Promise<string | null> => {
    try {
      const result = await refreshTokenApi();
      if (mountedRef.current) {
        setAccessToken(result.accessToken);
        setUser(result.user);
      }
      return result.accessToken;
    } catch {
      if (mountedRef.current) {
        setAccessToken(null);
        setUser(null);
      }
      return null;
    }
  }, []);

  // ── Login ──────────────────────────────────────────────────────────────────
  const login = useCallback(async (credentials: LoginRequest): Promise<void> => {
    const result = await loginApi(credentials);
    setAccessToken(result.accessToken);
    setUser(result.user);
  }, []);

  // ── Register ───────────────────────────────────────────────────────────────
  const register = useCallback(async (data: RegisterRequest): Promise<RegisterResponse> => {
    return registerApi(data);
  }, []);

  // ── Logout ─────────────────────────────────────────────────────────────────
  const logout = useCallback(async (): Promise<void> => {
    try {
      await logoutApi();
    } catch {
      // Even if server call fails, clear local state
    }
    setAccessToken(null);
    setUser(null);
  }, []);

  // ── Initial auth check (try refresh on mount) ─────────────────────────────
  useEffect(() => {
    mountedRef.current = true;

    // Register the refresh handler for the API client 401 interceptor
    setRefreshHandler(refreshToken);

    // Try to restore session from refresh cookie
    refreshToken().finally(() => {
      if (mountedRef.current) {
        setIsLoading(false);
      }
    });

    return () => {
      mountedRef.current = false;
    };
  }, [refreshToken]);

  const value: AuthContextValue = {
    user,
    isAuthenticated,
    isLoading,
    login,
    register,
    logout,
    refreshToken,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}
