// @vitest-environment node
/**
 * Unit tests for auth Zod schemas.
 * Tests input validation for register, login, verify-email, resend-verification.
 */
import { describe, it, expect } from 'vitest';
import {
  registerSchema,
  loginSchema,
  verifyEmailSchema,
  resendVerificationSchema,
} from '../auth.schemas.js';

describe('registerSchema', () => {
  it('validates a correct registration input', () => {
    const result = registerSchema.safeParse({
      email: 'test@example.com',
      password: 'Password123!',
      name: 'Test User',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.email).toBe('test@example.com');
      expect(result.data.name).toBe('Test User');
    }
  });

  it('lowercases email', () => {
    const result = registerSchema.safeParse({
      email: 'Test@Example.COM',
      password: 'Password123!',
      name: 'Test',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.email).toBe('test@example.com');
    }
  });

  it('trims name', () => {
    const result = registerSchema.safeParse({
      email: 'test@example.com',
      password: 'Password123!',
      name: '  Test User  ',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.name).toBe('Test User');
    }
  });

  it('rejects invalid email', () => {
    const result = registerSchema.safeParse({
      email: 'not-an-email',
      password: 'Password123!',
      name: 'Test',
    });
    expect(result.success).toBe(false);
  });

  it('rejects password shorter than 8 chars', () => {
    const result = registerSchema.safeParse({
      email: 'test@example.com',
      password: 'short',
      name: 'Test',
    });
    expect(result.success).toBe(false);
  });

  it('rejects password longer than 128 chars', () => {
    const result = registerSchema.safeParse({
      email: 'test@example.com',
      password: 'a'.repeat(129),
      name: 'Test',
    });
    expect(result.success).toBe(false);
  });

  it('accepts password of exactly 8 chars', () => {
    const result = registerSchema.safeParse({
      email: 'test@example.com',
      password: '12345678',
      name: 'Test',
    });
    expect(result.success).toBe(true);
  });

  it('rejects empty name', () => {
    const result = registerSchema.safeParse({
      email: 'test@example.com',
      password: 'Password123!',
      name: '',
    });
    expect(result.success).toBe(false);
  });

  it('rejects name longer than 100 chars', () => {
    const result = registerSchema.safeParse({
      email: 'test@example.com',
      password: 'Password123!',
      name: 'A'.repeat(101),
    });
    expect(result.success).toBe(false);
  });

  it('rejects missing fields', () => {
    expect(registerSchema.safeParse({}).success).toBe(false);
    expect(registerSchema.safeParse({ email: 'test@test.com' }).success).toBe(false);
    expect(registerSchema.safeParse({ password: 'Password123!' }).success).toBe(false);
  });
});

describe('loginSchema', () => {
  it('validates correct login input', () => {
    const result = loginSchema.safeParse({
      email: 'user@example.com',
      password: 'Password123!',
    });
    expect(result.success).toBe(true);
  });

  it('lowercases email', () => {
    const result = loginSchema.safeParse({
      email: 'USER@EXAMPLE.COM',
      password: 'Password123!',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.email).toBe('user@example.com');
    }
  });

  it('rejects invalid email', () => {
    const result = loginSchema.safeParse({
      email: 'bad',
      password: 'Password123!',
    });
    expect(result.success).toBe(false);
  });

  it('rejects short password', () => {
    const result = loginSchema.safeParse({
      email: 'user@example.com',
      password: 'short',
    });
    expect(result.success).toBe(false);
  });
});

describe('verifyEmailSchema', () => {
  it('validates a 6-digit code', () => {
    const result = verifyEmailSchema.safeParse({ code: '123456' });
    expect(result.success).toBe(true);
  });

  it('rejects non-numeric code', () => {
    const result = verifyEmailSchema.safeParse({ code: 'abcdef' });
    expect(result.success).toBe(false);
  });

  it('rejects code shorter than 6 digits', () => {
    const result = verifyEmailSchema.safeParse({ code: '12345' });
    expect(result.success).toBe(false);
  });

  it('rejects code longer than 6 digits', () => {
    const result = verifyEmailSchema.safeParse({ code: '1234567' });
    expect(result.success).toBe(false);
  });

  it('rejects missing code', () => {
    const result = verifyEmailSchema.safeParse({});
    expect(result.success).toBe(false);
  });
});

describe('resendVerificationSchema', () => {
  it('validates correct email', () => {
    const result = resendVerificationSchema.safeParse({ email: 'test@example.com' });
    expect(result.success).toBe(true);
  });

  it('lowercases email', () => {
    const result = resendVerificationSchema.safeParse({ email: 'TEST@EXAMPLE.COM' });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.email).toBe('test@example.com');
    }
  });

  it('rejects invalid email', () => {
    const result = resendVerificationSchema.safeParse({ email: 'not-email' });
    expect(result.success).toBe(false);
  });
});
