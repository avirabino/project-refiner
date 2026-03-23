/**
 * AuthGuard — protects routes that require authentication
 *
 * - Redirects to /auth/login if not authenticated
 * - Shows loading spinner while checking auth state (no flash)
 * - Wraps protected route content via React Router Outlet
 */

import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

export function AuthGuard() {
  const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  // Loading state — show spinner, don't flash login page
  if (isLoading) {
    return (
      <div className="min-h-screen bg-v-bg-base flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-2 border-v-accent-400 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-v-text-secondary">Loading...</p>
        </div>
      </div>
    );
  }

  // Not authenticated — redirect to login, preserve intended destination
  if (!isAuthenticated) {
    return <Navigate to="/auth/login" state={{ from: location }} replace />;
  }

  // Authenticated — render protected content
  return <Outlet />;
}
