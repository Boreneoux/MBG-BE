import { authService } from '../auth.service';
import { authRepository } from '../../repositories/auth.repository';
import { AppError } from '../../utils/AppError';
import * as bcryptHelper from '../../helpers/bcrypt.helper';
import * as authHelpers from '../auth.helpers';

jest.mock('../../repositories/auth.repository');
jest.mock('../../helpers/bcrypt.helper');
jest.mock('../auth.helpers', () => ({
  ...jest.requireActual('../auth.helpers'),
  sendVerificationEmail: jest.fn(),
  sendResetEmail: jest.fn(),
  generateReferralCode: jest.fn(() => 'ABCD1234')
}));
jest.mock('../../config/prisma-client.config', () => ({
  prisma: {
    $transaction: jest.fn((fn: (tx: unknown) => unknown) => fn({}))
  }
}));
jest.mock('../../config/logger.config', () => ({
  __esModule: true,
  default: { info: jest.fn(), error: jest.fn() }
}));

const mockRepo = jest.mocked(authRepository);
const mockBcrypt = jest.mocked(bcryptHelper);

const mockUser = {
  id: 1,
  email: 'user@test.com',
  first_name: 'John',
  last_name: 'Doe',
  phone: '08123456789',
  password: 'hashed_pw',
  role: 'user' as const,
  is_verified: true,
  referral_code: 'JOHN1234',
  referred_by_id: null,
  profile_image: null,
  profile_image_public_id: null,
  created_at: new Date(),
  updated_at: new Date(),
  deleted_at: null
};

beforeEach(() => jest.clearAllMocks());

describe('authService.register', () => {
  const input = {
    first_name: 'John',
    last_name: 'Doe',
    email: 'new@test.com',
    phone: '08123456789'
  };

  it('throws 409 when email is already in use', async () => {
    mockRepo.findUserByEmail.mockResolvedValue(mockUser);
    await expect(authService.register(input)).rejects.toThrow(
      new AppError('Email already in use', 409)
    );
  });

  it('throws 400 when referral code is invalid', async () => {
    mockRepo.findUserByEmail.mockResolvedValue(null);
    mockRepo.findUserByReferralCode.mockResolvedValue(null);
    await expect(
      authService.register({ ...input, referral_code: 'INVALID' })
    ).rejects.toThrow(new AppError('Invalid referral code', 400));
  });

  it('creates user and sends verification email on success', async () => {
    mockRepo.findUserByEmail.mockResolvedValue(null);
    mockRepo.findUserByReferralCode.mockResolvedValue(null);
    mockRepo.createUser.mockResolvedValue(mockUser);
    mockRepo.createVerificationToken.mockResolvedValue({} as any);

    const result = await authService.register(input);

    expect(mockRepo.createUser).toHaveBeenCalledTimes(1);
    expect(authHelpers.sendVerificationEmail).toHaveBeenCalledTimes(1);
    expect(result).toEqual({ user: { id: 1, email: 'user@test.com' } });
  });
});

describe('authService.login', () => {
  const input = { email: 'user@test.com', password: 'Password1' };

  it('throws 401 when user does not exist', async () => {
    mockRepo.findUserByEmail.mockResolvedValue(null);
    await expect(authService.login(input)).rejects.toThrow(
      new AppError('Invalid email or password', 401)
    );
  });

  it('throws 401 when user has no password (OAuth account)', async () => {
    mockRepo.findUserByEmail.mockResolvedValue({ ...mockUser, password: null });
    await expect(authService.login(input)).rejects.toThrow(AppError);
  });

  it('throws 401 when password does not match', async () => {
    mockRepo.findUserByEmail.mockResolvedValue(mockUser);
    mockBcrypt.hashMatch.mockResolvedValue(false);
    await expect(authService.login(input)).rejects.toThrow(
      new AppError('Invalid email or password', 401)
    );
  });

  it('throws 403 when email is not verified', async () => {
    mockRepo.findUserByEmail.mockResolvedValue({
      ...mockUser,
      is_verified: false
    });
    mockBcrypt.hashMatch.mockResolvedValue(true);
    await expect(authService.login(input)).rejects.toThrow(
      new AppError('Please verify your email address before logging in', 403)
    );
  });

  it('returns user and token on valid credentials', async () => {
    mockRepo.findUserByEmail.mockResolvedValue(mockUser);
    mockBcrypt.hashMatch.mockResolvedValue(true);
    const result = await authService.login(input);
    expect(result).toHaveProperty('user');
    expect(result).toHaveProperty('token');
    expect((result.user as any).password).toBeUndefined();
  });
});

describe('authService.verifyEmail', () => {
  const futureDate = new Date(Date.now() + 60 * 60 * 1000);
  const baseToken = {
    id: 1,
    user_id: 1,
    token: 'hashed',
    type: 'email_verification',
    is_used: false,
    expires_at: futureDate,
    created_at: new Date(),
    deleted_at: null
  };

  it('throws 400 on invalid token', async () => {
    mockRepo.findVerificationTokenByHash.mockResolvedValue(null);
    await expect(
      authService.verifyEmail('badtoken', 'Password1')
    ).rejects.toThrow(new AppError('Invalid or expired link', 400));
  });

  it('throws 400 on already-used token', async () => {
    mockRepo.findVerificationTokenByHash.mockResolvedValue({
      ...baseToken,
      is_used: true
    });
    await expect(
      authService.verifyEmail('usedtoken', 'Password1')
    ).rejects.toThrow(new AppError('This link has already been used', 400));
  });

  it('throws 400 on expired token', async () => {
    mockRepo.findVerificationTokenByHash.mockResolvedValue({
      ...baseToken,
      expires_at: new Date(Date.now() - 1000)
    });
    await expect(
      authService.verifyEmail('expiredtoken', 'Password1')
    ).rejects.toThrow(new AppError('This link has expired', 400));
  });

  it('updates user and marks token used on success', async () => {
    mockRepo.findVerificationTokenByHash.mockResolvedValue(baseToken);
    mockBcrypt.hashing.mockResolvedValue('new_hashed_pw');
    mockRepo.updateUser.mockResolvedValue(mockUser);
    mockRepo.markTokenUsed.mockResolvedValue({} as any);

    await authService.verifyEmail('validtoken', 'Password1');

    expect(mockRepo.updateUser).toHaveBeenCalledWith(
      1,
      expect.objectContaining({ is_verified: true }),
      {}
    );
    expect(mockRepo.markTokenUsed).toHaveBeenCalledWith(1, {});
  });
});

describe('authService.resendVerification', () => {
  it('returns obfuscated message for non-existent email', async () => {
    mockRepo.findUserByEmail.mockResolvedValue(null);
    const result = await authService.resendVerification('ghost@test.com');
    expect(result.message).toContain('If that email exists');
  });

  it('throws 400 when account is already verified', async () => {
    mockRepo.findUserByEmail.mockResolvedValue(mockUser);
    await expect(
      authService.resendVerification('user@test.com')
    ).rejects.toThrow(new AppError('Account is already verified', 400));
  });

  it('invalidates old tokens and sends new verification on success', async () => {
    mockRepo.findUserByEmail.mockResolvedValue({
      ...mockUser,
      is_verified: false
    });
    mockRepo.invalidateUserTokens.mockResolvedValue({ count: 1 });
    mockRepo.createVerificationToken.mockResolvedValue({} as any);

    await authService.resendVerification('user@test.com');

    expect(mockRepo.invalidateUserTokens).toHaveBeenCalledWith(
      1,
      'email_verification'
    );
    expect(authHelpers.sendVerificationEmail).toHaveBeenCalledTimes(1);
  });
});

describe('authService.forgotPassword', () => {
  it('returns obfuscated message for non-existent email', async () => {
    mockRepo.findUserByEmail.mockResolvedValue(null);
    const result = await authService.forgotPassword('ghost@test.com');
    expect(result.message).toContain('If that email exists');
  });

  it('returns obfuscated message for OAuth-only account (no password)', async () => {
    mockRepo.findUserByEmail.mockResolvedValue({ ...mockUser, password: null });
    const result = await authService.forgotPassword('user@test.com');
    expect(result.message).toContain('If that email exists');
  });

  it('invalidates old tokens and sends reset email on success', async () => {
    mockRepo.findUserByEmail.mockResolvedValue(mockUser);
    mockRepo.invalidateUserTokens.mockResolvedValue({ count: 1 });
    mockRepo.createVerificationToken.mockResolvedValue({} as any);

    await authService.forgotPassword('user@test.com');

    expect(mockRepo.invalidateUserTokens).toHaveBeenCalledWith(
      1,
      'password_reset'
    );
    expect(authHelpers.sendResetEmail).toHaveBeenCalledTimes(1);
  });
});

describe('authService.resetPassword', () => {
  const futureDate = new Date(Date.now() + 15 * 60 * 1000);
  const baseToken = {
    id: 2,
    user_id: 1,
    token: 'hashed',
    type: 'password_reset',
    is_used: false,
    expires_at: futureDate,
    created_at: new Date(),
    deleted_at: null
  };

  it('throws 400 on invalid token', async () => {
    mockRepo.findVerificationTokenByHash.mockResolvedValue(null);
    await expect(
      authService.resetPassword('badtoken', 'NewPass1')
    ).rejects.toThrow(new AppError('Invalid or expired link', 400));
  });

  it('updates password and marks token used on success', async () => {
    mockRepo.findVerificationTokenByHash.mockResolvedValue(baseToken);
    mockBcrypt.hashing.mockResolvedValue('new_hashed_pw');
    mockRepo.updateUser.mockResolvedValue(mockUser);
    mockRepo.markTokenUsed.mockResolvedValue({} as any);

    const result = await authService.resetPassword('validtoken', 'NewPass1');

    expect(mockRepo.updateUser).toHaveBeenCalledWith(
      1,
      { password: 'new_hashed_pw' },
      {}
    );
    expect(mockRepo.markTokenUsed).toHaveBeenCalledWith(2, {});
    expect(result.message).toBe('Password has been reset successfully');
  });
});
