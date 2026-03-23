/**
 * ResetPasswordPage — code + new password + confirm password
 *
 * D03: Reset password form. On success, redirects to login with message.
 * Password validation: 8-128 chars, match confirmation.
 */

import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AuthCard } from '../components/AuthCard';
import { FormInput } from '../components/FormInput';
import { Button } from '../components/Button';
import { Alert } from '../components/Alert';
import { PasswordStrength } from '../components/PasswordStrength';
import { resetPasswordApi } from '../auth.api';
import { ApiError } from '../../../shared/api/client';

export function ResetPasswordPage() {
  const navigate = useNavigate();

  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  function validate(): boolean {
    const errors: Record<string, string> = {};

    if (!code.trim()) errors.code = 'Reset code is required';
    else if (!/^\d{6}$/.test(code.trim())) errors.code = 'Code must be 6 digits';
    if (!newPassword) errors.newPassword = 'New password is required';
    else if (newPassword.length < 8) errors.newPassword = 'Password must be at least 8 characters';
    else if (newPassword.length > 128) errors.newPassword = 'Password must be 128 characters or fewer';
    if (!confirmPassword) errors.confirmPassword = 'Please confirm your password';
    else if (newPassword !== confirmPassword) errors.confirmPassword = 'Passwords do not match';

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setFieldErrors({});

    if (!validate()) return;

    setLoading(true);
    try {
      await resetPasswordApi({ code: code.trim(), newPassword });
      navigate('/auth/login', { state: { passwordReset: true } });
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.details) {
          const mapped: Record<string, string> = {};
          for (const d of err.details) {
            mapped[d.field] = d.message;
          }
          setFieldErrors(mapped);
        } else {
          setError(err.message);
        }
      } else {
        setError('An unexpected error occurred. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthCard
      title="Reset your password"
      subtitle="Enter the code from your email and choose a new password"
      footer={
        <>
          Remember your password?{' '}
          <Link
            to="/auth/login"
            className="text-v-accent-400 hover:text-v-accent-300 font-medium transition-colors"
          >
            Sign in
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        {error && <Alert type="error">{error}</Alert>}

        <FormInput
          label="Reset Code"
          type="text"
          inputMode="numeric"
          placeholder="123456"
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/[^0-9]/g, '').slice(0, 6))}
          autoComplete="one-time-code"
          autoFocus
          required
          disabled={loading}
          error={fieldErrors.code}
          hint="6-digit code from your email"
        />

        <div>
          <FormInput
            label="New Password"
            type="password"
            placeholder="Create a new password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            autoComplete="new-password"
            required
            disabled={loading}
            error={fieldErrors.newPassword}
          />
          <PasswordStrength password={newPassword} />
        </div>

        <FormInput
          label="Confirm Password"
          type="password"
          placeholder="Confirm your new password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          autoComplete="new-password"
          required
          disabled={loading}
          error={fieldErrors.confirmPassword}
        />

        <Button
          type="submit"
          loading={loading}
          className="w-full"
        >
          Reset Password
        </Button>
      </form>
    </AuthCard>
  );
}
