/**
 * API Client — authenticated fetch wrapper
 *
 * - Attaches Authorization: Bearer header from in-memory token
 * - Auto-refreshes on 401 responses (one retry)
 * - Token stored in closure (NEVER localStorage)
 *
 * Auth contract: ADR S09-001
 */

// ── In-memory token storage ──────────────────────────────────────────────────
let accessToken: string | null = null;
let refreshPromise: Promise<string | null> | null = null;

export function getAccessToken(): string | null {
  return accessToken;
}

export function setAccessToken(token: string | null): void {
  accessToken = token;
}

// ── Refresh handler (set by AuthProvider) ────────────────────────────────────
let onRefresh: (() => Promise<string | null>) | null = null;

export function setRefreshHandler(handler: () => Promise<string | null>): void {
  onRefresh = handler;
}

// ── Core fetch wrapper ───────────────────────────────────────────────────────

interface ApiRequestInit extends Omit<RequestInit, 'headers'> {
  headers?: Record<string, string>;
  skipAuth?: boolean;
}

/**
 * Authenticated fetch wrapper.
 * Automatically attaches Bearer token and retries once on 401.
 */
export async function apiClient<T = unknown>(
  url: string,
  options: ApiRequestInit = {},
): Promise<T> {
  const { skipAuth = false, headers = {}, ...rest } = options;

  // Build headers
  const reqHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
    ...headers,
  };

  if (!skipAuth && accessToken) {
    reqHeaders['Authorization'] = `Bearer ${accessToken}`;
  }

  const response = await fetch(url, {
    ...rest,
    headers: reqHeaders,
    credentials: 'include', // Send cookies (refresh token)
  });

  // If 401 and we have a refresh handler, try to refresh and retry once
  if (response.status === 401 && !skipAuth && onRefresh) {
    const newToken = await deduplicatedRefresh();
    if (newToken) {
      reqHeaders['Authorization'] = `Bearer ${newToken}`;
      const retryResponse = await fetch(url, {
        ...rest,
        headers: reqHeaders,
        credentials: 'include',
      });

      if (!retryResponse.ok) {
        const errorData = await retryResponse.json().catch(() => ({ error: `HTTP ${retryResponse.status}` }));
        throw new ApiError(retryResponse.status, errorData.error || `HTTP ${retryResponse.status}`, errorData.code);
      }
      return retryResponse.json() as Promise<T>;
    }

    // Refresh failed — throw 401
    throw new ApiError(401, 'Session expired', 'SESSION_EXPIRED');
  }

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: `HTTP ${response.status}` }));
    throw new ApiError(response.status, errorData.error || `HTTP ${response.status}`, errorData.code, errorData.details);
  }

  // Handle empty responses (204, etc.)
  const text = await response.text();
  if (!text) return {} as T;
  return JSON.parse(text) as T;
}

/**
 * Deduplicate concurrent refresh calls — only one in-flight at a time.
 */
async function deduplicatedRefresh(): Promise<string | null> {
  if (refreshPromise) return refreshPromise;
  if (!onRefresh) return null;

  refreshPromise = onRefresh().finally(() => {
    refreshPromise = null;
  });

  return refreshPromise;
}

// ── API Error class ──────────────────────────────────────────────────────────

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly code?: string,
    public readonly details?: Array<{ field: string; message: string }>,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}
