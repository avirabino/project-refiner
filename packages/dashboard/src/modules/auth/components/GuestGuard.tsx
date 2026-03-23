/**
 * GuestGuard — redirects authenticated users away from auth pages
 *
 * Wraps /auth/* routes. If user is already logged in, redirects to /dashboard.
 */

import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

export function GuestGuard() {
  const { isAuthenticated, isLoading } = useAuth();

  // While checking auth, show loading (don't flash auth form)
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

  // Already authenticated — redirect to dashboard
  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  return <Outlet />;
}
