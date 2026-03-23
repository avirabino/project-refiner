import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider, AuthGuard, GuestGuard } from './modules/auth';
import { LandingPage } from './modules/landing';
import { LoginPage } from './modules/auth/pages/LoginPage';
import { RegisterPage } from './modules/auth/pages/RegisterPage';
import { VerifyEmailPage } from './modules/auth/pages/VerifyEmailPage';
import { ForgotPasswordPage } from './modules/auth/pages/ForgotPasswordPage';
import { ResetPasswordPage } from './modules/auth/pages/ResetPasswordPage';
import { SettingsPage } from './modules/auth/pages/SettingsPage';
import { DashboardApp } from './DashboardApp';

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Public routes */}
          <Route path="/" element={<LandingPage />} />
          <Route path="/pricing" element={<LandingPage />} />

          {/* Auth routes — redirect to dashboard if already authenticated */}
          <Route element={<GuestGuard />}>
            <Route path="/auth/login" element={<LoginPage />} />
            <Route path="/auth/register" element={<RegisterPage />} />
            <Route path="/auth/verify" element={<VerifyEmailPage />} />
            <Route path="/auth/forgot-password" element={<ForgotPasswordPage />} />
            <Route path="/auth/reset-password" element={<ResetPasswordPage />} />
          </Route>

          {/* Protected routes — require authentication */}
          <Route element={<AuthGuard />}>
            <Route path="/dashboard" element={<DashboardApp />} />
            <Route path="/dashboard/settings" element={<SettingsPage />} />
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
