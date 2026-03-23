// ── Auth Module — Barrel Export ───────────────────────────────────────────────

// Hooks
export { useAuth } from './hooks/useAuth';

// Components
export { AuthProvider } from './components/AuthProvider';
export { AuthGuard } from './components/AuthGuard';
export { GuestGuard } from './components/GuestGuard';
export { AuthCard } from './components/AuthCard';
export { FormInput } from './components/FormInput';
export { Button } from './components/Button';
export { Alert } from './components/Alert';
export { PasswordStrength } from './components/PasswordStrength';

// Pages
export { LoginPage } from './pages/LoginPage';
export { RegisterPage } from './pages/RegisterPage';
export { VerifyEmailPage } from './pages/VerifyEmailPage';
export { ForgotPasswordPage } from './pages/ForgotPasswordPage';
export { ResetPasswordPage } from './pages/ResetPasswordPage';
export { SettingsPage } from './pages/SettingsPage';

// Types
export type { AuthUser, AuthContextValue, LoginRequest, RegisterRequest } from './auth.types';
