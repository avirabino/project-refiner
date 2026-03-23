// @vitest-environment node
/**
 * Unit tests for auth.service.ts — B03, B04, B05.
 *
 * Mocks the Neon database pool to test service logic without a real DB.
 * Mocks password.utils.ts and jwt.utils.ts to isolate service logic.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// ============================================================================
// Mock the database client
// ============================================================================

const mockQuery = vi.fn();
const mockPool = { query: mockQuery };

vi.mock('../../../db/client.js', () => ({
  getPool: () => mockPool,
}));

// ============================================================================
// Mock password utils (Argon2id is slow — use fast mocks in tests)
// ============================================================================

vi.mock('../password.utils.js', () => ({
  hashPassword: vi.fn(async (plain: string) => `argon2id_hash_of_${plain}`),
  verifyPassword: vi.fn(async (plain: string, hash: string) => hash === `argon2id_hash_of_${plain}`),
}));

// ============================================================================
// Mock JWT utils
// ============================================================================

vi.mock('../jwt.utils.js', () => ({
  generateAccessToken: vi.fn(() => 'mock_access_token_jwt'),
  generateRefreshToken: vi.fn(() => ({
    token: 'mock_refresh_token_hex',
    tokenHash: 'mock_refresh_token_hash',
    expiresAt: new Date('2026-03-30T00:00:00Z'),
  })),
  generateFingerprint: vi.fn(() => ({
    value: 'mock_fingerprint_value',
    hash: 'mock_fingerprint_hash',
  })),
}));

// Import AFTER mocks are set up
import {
  register,
  verifyEmail,
  resendVerification,
  login,
  maybeRenewPlanTokens,
  storeRefreshToken,
  validateRefreshToken,
  invalidateRefreshToken,
  invalidateAllUserRefreshTokens,
  AuthError,
} from '../auth.service.js';

describe('register (B03)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('creates a user when email does not exist', async () => {
    // Mock: no existing user
    mockQuery
      .mockResolvedValueOnce({ rowCount: 0, rows: [] }) // duplicate check
      .mockResolvedValueOnce({ rowCount: 1, rows: [{ id: 'uuid-123' }] }) // INSERT user
      .mockResolvedValueOnce({ rowCount: 1, rows: [] }); // INSERT email_verification

    const result = await register({
      email: 'new@example.com',
      password: 'SecurePass1!',
      name: 'New User',
    });

    expect(result.userId).toBe('uuid-123');
    expect(result.emailVerified).toBe(false);
    expect(result.verificationCode).toMatch(/^\d{6}$/);

    // Verify parameterized queries were used
    expect(mockQuery).toHaveBeenCalledTimes(3);

    // First call: duplicate check
    const [dupSql, dupParams] = mockQuery.mock.calls[0];
    expect(dupSql).toContain('SELECT id FROM users WHERE email = $1');
    expect(dupParams).toEqual(['new@example.com']);

    // Second call: INSERT user with Argon2id hash
    const [insertSql, insertParams] = mockQuery.mock.calls[1];
    expect(insertSql).toContain('INSERT INTO users');
    expect(insertParams[1]).toBe('new@example.com'); // email
    expect(insertParams[2]).toBe('argon2id_hash_of_SecurePass1!'); // hashed password
    expect(insertParams[3]).toBe('New User'); // name
    expect(insertParams[0]).toMatch(/^sl_[a-f0-9]{24}$/); // synaptixlabs_id

    // Third call: INSERT email_verification
    const [verifSql, verifParams] = mockQuery.mock.calls[2];
    expect(verifSql).toContain('INSERT INTO email_verification');
    expect(verifParams[0]).toMatch(/^\d{6}$/); // 6-digit code
    expect(verifParams[1]).toBe('new@example.com');
    expect(verifParams[2]).toBe('uuid-123');
  });

  it('throws 409 when email already exists', async () => {
    mockQuery.mockResolvedValueOnce({ rowCount: 1, rows: [{ id: 'existing' }] });

    await expect(register({
      email: 'existing@example.com',
      password: 'SecurePass1!',
      name: 'Duplicate',
    })).rejects.toThrow(AuthError);

    try {
      mockQuery.mockResolvedValueOnce({ rowCount: 1, rows: [{ id: 'existing' }] });
      await register({
        email: 'existing@example.com',
        password: 'SecurePass1!',
        name: 'Duplicate',
      });
    } catch (err) {
      expect(err).toBeInstanceOf(AuthError);
      expect((err as AuthError).statusCode).toBe(409);
      expect((err as AuthError).code).toBe('EMAIL_EXISTS');
    }
  });
});

describe('verifyEmail (B04)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('verifies a valid unexpired code', async () => {
    const futureDate = new Date(Date.now() + 10 * 60 * 1000); // 10 min from now
    mockQuery
      .mockResolvedValueOnce({
        rowCount: 1,
        rows: [{ id: 'ver-1', user_id: 'user-1', expires_at: futureDate }],
      }) // SELECT code
      .mockResolvedValueOnce({ rowCount: 1, rows: [] }) // UPDATE used
      .mockResolvedValueOnce({ rowCount: 1, rows: [] }); // UPDATE email_verified

    const result = await verifyEmail('123456');

    expect(result.emailVerified).toBe(true);
    expect(mockQuery).toHaveBeenCalledTimes(3);

    // Verify code was marked as used
    const [usedSql, usedParams] = mockQuery.mock.calls[1];
    expect(usedSql).toContain('UPDATE email_verification SET used = true');
    expect(usedParams).toEqual(['ver-1']);

    // Verify user was marked as verified
    const [verifiedSql, verifiedParams] = mockQuery.mock.calls[2];
    expect(verifiedSql).toContain('UPDATE users SET email_verified = true');
    expect(verifiedParams).toEqual(['user-1']);
  });

  it('throws 400 for invalid code', async () => {
    mockQuery.mockResolvedValueOnce({ rowCount: 0, rows: [] });

    await expect(verifyEmail('000000')).rejects.toThrow(AuthError);

    try {
      mockQuery.mockResolvedValueOnce({ rowCount: 0, rows: [] });
      await verifyEmail('000000');
    } catch (err) {
      expect((err as AuthError).statusCode).toBe(400);
      expect((err as AuthError).code).toBe('INVALID_CODE');
    }
  });

  it('throws 400 for expired code', async () => {
    const pastDate = new Date(Date.now() - 10 * 60 * 1000); // 10 min ago
    mockQuery.mockResolvedValueOnce({
      rowCount: 1,
      rows: [{ id: 'ver-2', user_id: 'user-2', expires_at: pastDate }],
    });

    await expect(verifyEmail('999999')).rejects.toThrow(AuthError);

    try {
      mockQuery.mockResolvedValueOnce({
        rowCount: 1,
        rows: [{ id: 'ver-2', user_id: 'user-2', expires_at: pastDate }],
      });
      await verifyEmail('999999');
    } catch (err) {
      expect((err as AuthError).statusCode).toBe(400);
      expect((err as AuthError).code).toBe('CODE_EXPIRED');
    }
  });
});

describe('resendVerification (B04)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('generates a new code for unverified user', async () => {
    mockQuery
      .mockResolvedValueOnce({
        rowCount: 1,
        rows: [{ id: 'user-1', email_verified: false }],
      }) // SELECT user
      .mockResolvedValueOnce({ rowCount: 1, rows: [] }) // UPDATE old codes
      .mockResolvedValueOnce({ rowCount: 1, rows: [] }); // INSERT new code

    const result = await resendVerification('user@example.com');

    expect(result).not.toBeNull();
    expect(result!.code).toMatch(/^\d{6}$/);
    expect(mockQuery).toHaveBeenCalledTimes(3);

    // Verify old codes were invalidated
    const [invalidateSql] = mockQuery.mock.calls[1];
    expect(invalidateSql).toContain('UPDATE email_verification SET used = true');
  });

  it('returns null for non-existent email', async () => {
    mockQuery.mockResolvedValueOnce({ rowCount: 0, rows: [] });

    const result = await resendVerification('nonexistent@example.com');
    expect(result).toBeNull();
  });

  it('returns null for already verified user', async () => {
    mockQuery.mockResolvedValueOnce({
      rowCount: 1,
      rows: [{ id: 'user-1', email_verified: true }],
    });

    const result = await resendVerification('verified@example.com');
    expect(result).toBeNull();
  });
});

describe('login (B05)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockUser = {
    id: 'user-1',
    synaptixlabs_id: 'sl_abc123',
    email: 'user@example.com',
    password_hash: 'argon2id_hash_of_CorrectPass1!',
    name: 'Test User',
    role: 'user',
    plan: 'free',
    products: ['vigil'],
    email_verified: true,
    login_count: 5,
    failed_login_attempts: 0,
    locked_until: null,
    plan_tokens: 100,
    tokens_renewed_at: new Date(),
  };

  it('returns tokens and user on successful login', async () => {
    mockQuery
      .mockResolvedValueOnce({ rowCount: 1, rows: [mockUser] }) // SELECT user
      .mockResolvedValueOnce({ rowCount: 1, rows: [] }) // INSERT refresh_tokens
      .mockResolvedValueOnce({ rowCount: 1, rows: [] }); // UPDATE login_count

    const result = await login({ email: 'user@example.com', password: 'CorrectPass1!' });

    expect(result.accessToken).toBe('mock_access_token_jwt');
    expect(result.refreshToken.token).toBe('mock_refresh_token_hex');
    expect(result.fingerprint.value).toBe('mock_fingerprint_value');
    expect(result.user.id).toBe('user-1');
    expect(result.user.email).toBe('user@example.com');
    expect(result.user.role).toBe('user');
    expect(result.user.plan).toBe('free');
  });

  it('throws 401 for non-existent email', async () => {
    mockQuery.mockResolvedValueOnce({ rowCount: 0, rows: [] });

    try {
      await login({ email: 'nobody@example.com', password: 'Anything1!' });
      expect.fail('Should have thrown');
    } catch (err) {
      expect(err).toBeInstanceOf(AuthError);
      expect((err as AuthError).statusCode).toBe(401);
      expect((err as AuthError).code).toBe('INVALID_CREDENTIALS');
    }
  });

  it('throws 401 for wrong password and increments failed attempts', async () => {
    mockQuery
      .mockResolvedValueOnce({ rowCount: 1, rows: [mockUser] }) // SELECT user
      .mockResolvedValueOnce({ rowCount: 1, rows: [] }); // UPDATE failed_login_attempts

    try {
      await login({ email: 'user@example.com', password: 'WrongPass1!' });
      expect.fail('Should have thrown');
    } catch (err) {
      expect(err).toBeInstanceOf(AuthError);
      expect((err as AuthError).statusCode).toBe(401);
    }

    // Verify failed attempts were incremented
    const updateCall = mockQuery.mock.calls[1];
    expect(updateCall[0]).toContain('failed_login_attempts');
    expect(updateCall[1][0]).toBe(1); // new attempt count
  });

  it('locks account after 5 failed attempts', async () => {
    const userWith4Failures = { ...mockUser, failed_login_attempts: 4 };
    mockQuery
      .mockResolvedValueOnce({ rowCount: 1, rows: [userWith4Failures] }) // SELECT user
      .mockResolvedValueOnce({ rowCount: 1, rows: [] }); // UPDATE lockout

    try {
      await login({ email: 'user@example.com', password: 'WrongPass1!' });
      expect.fail('Should have thrown');
    } catch (err) {
      expect(err).toBeInstanceOf(AuthError);
      expect((err as AuthError).statusCode).toBe(423);
      expect((err as AuthError).code).toBe('ACCOUNT_LOCKED');
    }

    // Verify lockout was set
    const updateCall = mockQuery.mock.calls[1];
    expect(updateCall[0]).toContain('locked_until');
    expect(updateCall[1][0]).toBe(5); // 5 attempts
  });

  it('rejects login while account is locked', async () => {
    const lockedUser = {
      ...mockUser,
      failed_login_attempts: 5,
      locked_until: new Date(Date.now() + 10 * 60 * 1000), // 10 min from now
    };
    mockQuery.mockResolvedValueOnce({ rowCount: 1, rows: [lockedUser] });

    try {
      await login({ email: 'user@example.com', password: 'CorrectPass1!' });
      expect.fail('Should have thrown');
    } catch (err) {
      expect(err).toBeInstanceOf(AuthError);
      expect((err as AuthError).statusCode).toBe(423);
      expect((err as AuthError).code).toBe('ACCOUNT_LOCKED');
    }
  });

  it('resets lockout after expiry and allows login', async () => {
    const expiredLockUser = {
      ...mockUser,
      password_hash: 'argon2id_hash_of_CorrectPass1!',
      failed_login_attempts: 5,
      locked_until: new Date(Date.now() - 1000), // Expired 1 second ago
    };
    mockQuery
      .mockResolvedValueOnce({ rowCount: 1, rows: [expiredLockUser] }) // SELECT user
      .mockResolvedValueOnce({ rowCount: 1, rows: [] }) // UPDATE reset lockout
      .mockResolvedValueOnce({ rowCount: 1, rows: [] }) // INSERT refresh_tokens
      .mockResolvedValueOnce({ rowCount: 1, rows: [] }); // UPDATE login_count

    const result = await login({ email: 'user@example.com', password: 'CorrectPass1!' });
    expect(result.accessToken).toBe('mock_access_token_jwt');
  });

  it('throws 403 for unverified email', async () => {
    const unverifiedUser = { ...mockUser, email_verified: false };
    mockQuery.mockResolvedValueOnce({ rowCount: 1, rows: [unverifiedUser] });

    try {
      await login({ email: 'user@example.com', password: 'CorrectPass1!' });
      expect.fail('Should have thrown');
    } catch (err) {
      expect(err).toBeInstanceOf(AuthError);
      expect((err as AuthError).statusCode).toBe(403);
      expect((err as AuthError).code).toBe('EMAIL_NOT_VERIFIED');
    }
  });

  it('stores refresh token hash in DB on login', async () => {
    mockQuery
      .mockResolvedValueOnce({ rowCount: 1, rows: [mockUser] }) // SELECT user
      .mockResolvedValueOnce({ rowCount: 1, rows: [] }) // INSERT refresh_tokens
      .mockResolvedValueOnce({ rowCount: 1, rows: [] }); // UPDATE login_count

    await login({ email: 'user@example.com', password: 'CorrectPass1!' });

    // Check that refresh token was stored
    const refreshCall = mockQuery.mock.calls[1];
    expect(refreshCall[0]).toContain('INSERT INTO refresh_tokens');
    expect(refreshCall[1]).toContain('mock_refresh_token_hash');
  });

  it('resets failed attempts on successful login', async () => {
    const userWithFailures = {
      ...mockUser,
      failed_login_attempts: 3,
      locked_until: null,
    };
    mockQuery
      .mockResolvedValueOnce({ rowCount: 1, rows: [userWithFailures] }) // SELECT user
      .mockResolvedValueOnce({ rowCount: 1, rows: [] }) // UPDATE reset failed attempts
      .mockResolvedValueOnce({ rowCount: 1, rows: [] }) // INSERT refresh_tokens
      .mockResolvedValueOnce({ rowCount: 1, rows: [] }); // UPDATE login_count

    await login({ email: 'user@example.com', password: 'CorrectPass1!' });

    // Check that failed attempts were reset
    const resetCall = mockQuery.mock.calls[1];
    expect(resetCall[0]).toContain('failed_login_attempts = 0');
  });
});

describe('maybeRenewPlanTokens (B05)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('does not renew when same month', async () => {
    const now = new Date();
    const result = await maybeRenewPlanTokens('user-1', 'free', 50, now);
    expect(result).toBe(false);
    expect(mockQuery).not.toHaveBeenCalled();
  });

  it('renews when month boundary crossed', async () => {
    // tokens_renewed_at is last month
    const lastMonth = new Date();
    lastMonth.setUTCMonth(lastMonth.getUTCMonth() - 1);

    mockQuery.mockResolvedValueOnce({ rowCount: 1, rows: [] });

    const result = await maybeRenewPlanTokens('user-1', 'free', 50, lastMonth);
    expect(result).toBe(true);

    // Check that plan_tokens was reset to 100 (free plan allocation)
    const [sql, params] = mockQuery.mock.calls[0];
    expect(sql).toContain('UPDATE users SET plan_tokens = $1');
    expect(params[0]).toBe(100); // free plan allocation
  });

  it('renews with correct allocation for pro plan', async () => {
    const lastMonth = new Date();
    lastMonth.setUTCMonth(lastMonth.getUTCMonth() - 1);

    mockQuery.mockResolvedValueOnce({ rowCount: 1, rows: [] });

    await maybeRenewPlanTokens('user-1', 'pro', 200, lastMonth);

    const [, params] = mockQuery.mock.calls[0];
    expect(params[0]).toBe(1000); // pro plan allocation
  });

  it('renews with correct allocation for team plan', async () => {
    const lastMonth = new Date();
    lastMonth.setUTCMonth(lastMonth.getUTCMonth() - 1);

    mockQuery.mockResolvedValueOnce({ rowCount: 1, rows: [] });

    await maybeRenewPlanTokens('user-1', 'team', 0, lastMonth);

    const [, params] = mockQuery.mock.calls[0];
    expect(params[0]).toBe(5000); // team plan allocation
  });
});

describe('refresh token management (B05)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('storeRefreshToken inserts hash into DB', async () => {
    mockQuery.mockResolvedValueOnce({ rowCount: 1, rows: [] });

    await storeRefreshToken('user-1', {
      token: 'raw_token',
      tokenHash: 'sha256_hash',
      expiresAt: new Date('2026-03-30'),
    });

    const [sql, params] = mockQuery.mock.calls[0];
    expect(sql).toContain('INSERT INTO refresh_tokens');
    expect(params[0]).toBe('user-1');
    expect(params[1]).toBe('sha256_hash');
  });

  it('validateRefreshToken returns userId for valid token', async () => {
    mockQuery.mockResolvedValueOnce({
      rowCount: 1,
      rows: [{ user_id: 'user-1' }],
    });

    const result = await validateRefreshToken('valid_hash');
    expect(result).toEqual({ userId: 'user-1' });
  });

  it('validateRefreshToken returns null for invalid/expired token', async () => {
    mockQuery.mockResolvedValueOnce({ rowCount: 0, rows: [] });

    const result = await validateRefreshToken('expired_hash');
    expect(result).toBeNull();
  });

  it('invalidateRefreshToken deletes from DB', async () => {
    mockQuery.mockResolvedValueOnce({ rowCount: 1, rows: [] });

    await invalidateRefreshToken('hash_to_delete');

    const [sql, params] = mockQuery.mock.calls[0];
    expect(sql).toContain('DELETE FROM refresh_tokens');
    expect(params[0]).toBe('hash_to_delete');
  });

  it('invalidateAllUserRefreshTokens deletes all for user', async () => {
    mockQuery.mockResolvedValueOnce({ rowCount: 3, rows: [] });

    await invalidateAllUserRefreshTokens('user-1');

    const [sql, params] = mockQuery.mock.calls[0];
    expect(sql).toContain('DELETE FROM refresh_tokens WHERE user_id');
    expect(params[0]).toBe('user-1');
  });
});
