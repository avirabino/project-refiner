/**
 * ForgotPasswordPage — email input to request password reset
 *
 * D03: Email input, submit, show "check your email" message.
 * Always shows success message (never reveal if email exists).
 */

import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { AuthCard } from '../components/AuthCard';
import { FormInput } from '../components/FormInput';
import { Button } from '../components/Button';
import { Alert } from '../components/Alert';
import { forgotPasswordApi } from '../auth.api';
import { ApiError } from '../../../shared/api/client';

export function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');

    if (!email.trim()) {
      setError('Email is required');
      return;
    }

    setLoading(true);
    try {
      await forgotPasswordApi({ email: email.trim() });
      setSubmitted(true);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('An unexpected error occurred. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  }

  if (submitted) {
    return (
      <AuthCard
        title="Check your email"
        subtitle={`If an account exists for ${email}, we've sent a password reset code.`}
        footer={
          <Link
            to="/auth/login"
            className="text-v-accent-400 hover:text-v-accent-300 font-medium transition-colors"
          >
            Back to sign in
          </Link>
        }
      >
        <div className="space-y-4">
          <Alert type="info">
            Check your email for a 6-digit reset code. It may take a few minutes to arrive.
          </Alert>
          <Link to="/auth/reset-password" state={{ email: email.trim() }}>
            <Button variant="secondary" className="w-full">
              I have a reset code
            </Button>
          </Link>
        </div>
      </AuthCard>
    );
  }

  return (
    <AuthCard
      title="Forgot password?"
      subtitle="Enter your email and we'll send you a reset code"
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
          label="Email"
          type="email"
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
          autoFocus
          required
          disabled={loading}
        />

        <Button
          type="submit"
          loading={loading}
          className="w-full"
        >
          Send Reset Code
        </Button>
      </form>
    </AuthCard>
  );
}
