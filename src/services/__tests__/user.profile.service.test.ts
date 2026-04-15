import { userService } from '../user.service';
import { userRepository } from '../../repositories/user.repository';
import { authRepository } from '../../repositories/auth.repository';
import * as bcryptHelper from '../../helpers/bcrypt.helper';
import * as authHelpers from '../auth.helpers';
import { AppError } from '../../utils/AppError';

// Mocks

jest.mock('../../repositories/user.repository');
jest.mock('../../repositories/auth.repository');
jest.mock('../../helpers/bcrypt.helper');
jest.mock('../auth.helpers', () => ({
  ...jest.requireActual('../auth.helpers'),
  generateToken: jest.fn(() => ({ raw: 'raw_token', hashed: 'hashed_token' })),
  sendVerificationEmail: jest.fn()
}));
jest.mock('../../config/logger.config', () => ({
  __esModule: true,
  default: { info: jest.fn(), error: jest.fn(), warn: jest.fn() }
}));

const mockRepo = jest.mocked(userRepository);
const mockAuthRepo = jest.mocked(authRepository);
const mockBcrypt = jest.mocked(bcryptHelper);

// Fixtures

const mockProfile = {
  id: 1,
  first_name: 'John',
  last_name: 'Doe',
  email: 'john@test.com',
  phone: '08123456789',
  role: 'user' as const,
  is_verified: true,
  profile_image: null,
  profile_image_public_id: null,
  created_at: new Date(),
  updated_at: new Date(),
  store_admins: []
};

const mockUserWithPassword = {
  id: 1,
  email: 'john@test.com',
  first_name: 'John',
  last_name: 'Doe',
  password: 'hashed_pw'
};

beforeEach(() => jest.clearAllMocks());

// userService.getProfile

describe('userService.getProfile', () => {
  it('throws 404 when user does not exist', async () => {
    mockRepo.findById.mockResolvedValue(null);

    await expect(userService.getProfile(1)).rejects.toThrow(
      new AppError('User not found', 404)
    );
  });

  it('returns user profile data for existing user', async () => {
    mockRepo.findById.mockResolvedValue(mockProfile);

    const result = await userService.getProfile(1);

    expect(result).toEqual(mockProfile);
    expect(mockRepo.findById).toHaveBeenCalledWith(1);
  });
});

// userService.updateProfile — basic info (name / phone)

describe('userService.updateProfile — basic info update', () => {
  it('throws 404 when user does not exist', async () => {
    mockRepo.findById.mockResolvedValue(null);

    await expect(
      userService.updateProfile(99, { first_name: 'Jane' })
    ).rejects.toThrow(new AppError('User not found', 404));
  });

  it('updates first_name, last_name, and phone', async () => {
    mockRepo.findById.mockResolvedValue(mockProfile);
    mockRepo.update.mockResolvedValue({
      ...mockProfile,
      first_name: 'Jane'
    } as never);

    await userService.updateProfile(1, {
      first_name: 'Jane',
      last_name: 'Smith',
      phone: '08999999999'
    });

    expect(mockRepo.update).toHaveBeenCalledWith(
      1,
      expect.objectContaining({
        first_name: 'Jane',
        last_name: 'Smith',
        phone: '08999999999'
      })
    );
  });

  it('omits undefined fields from the update payload (partial update)', async () => {
    mockRepo.findById.mockResolvedValue(mockProfile);
    mockRepo.update.mockResolvedValue(mockProfile as never);

    await userService.updateProfile(1, { first_name: 'Jane' });

    const updatePayload = mockRepo.update.mock.calls[0][1];
    expect(updatePayload).not.toHaveProperty('last_name');
    expect(updatePayload).not.toHaveProperty('phone');
  });
});

// userService.updateProfile — password change

describe('userService.updateProfile — password change', () => {
  it('throws 400 when new_password is provided but current_password is missing', async () => {
    mockRepo.findById.mockResolvedValue(mockProfile);

    await expect(
      userService.updateProfile(1, { new_password: 'NewPass1!' })
    ).rejects.toThrow(new AppError('Current password is required', 400));
  });

  it('throws 400 when account has no password (OAuth-only account)', async () => {
    mockRepo.findById.mockResolvedValue(mockProfile);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (mockRepo as any).findByIdWithPassword.mockResolvedValue({
      ...mockUserWithPassword,
      password: null
    });

    await expect(
      userService.updateProfile(1, {
        current_password: 'OldPass1!',
        new_password: 'NewPass1!'
      })
    ).rejects.toThrow(
      new AppError(
        'Cannot change password for accounts linked via social login',
        400
      )
    );
  });

  it('throws 400 when current_password does not match', async () => {
    mockRepo.findById.mockResolvedValue(mockProfile);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (mockRepo as any).findByIdWithPassword.mockResolvedValue(
      mockUserWithPassword
    );
    mockBcrypt.hashMatch.mockResolvedValue(false);

    await expect(
      userService.updateProfile(1, {
        current_password: 'WrongPass1!',
        new_password: 'NewPass1!'
      })
    ).rejects.toThrow(new AppError('Current password is incorrect', 400));
  });

  it('hashes and saves new password when current_password is correct', async () => {
    mockRepo.findById.mockResolvedValue(mockProfile);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (mockRepo as any).findByIdWithPassword.mockResolvedValue(
      mockUserWithPassword
    );
    mockBcrypt.hashMatch.mockResolvedValue(true);
    mockBcrypt.hashing.mockResolvedValue('new_hashed_pw');
    mockRepo.update.mockResolvedValue(mockProfile as never);

    await userService.updateProfile(1, {
      current_password: 'OldPass1!',
      new_password: 'NewPass1!'
    });

    expect(mockBcrypt.hashing).toHaveBeenCalledWith('NewPass1!');
    expect(mockRepo.update).toHaveBeenCalledWith(
      1,
      expect.objectContaining({ password: 'new_hashed_pw' })
    );
  });
});

// userService.updateProfile — email change (re-verification flow)

describe('userService.updateProfile — email change', () => {
  it('throws 409 when new email is already registered by another user', async () => {
    mockRepo.findById.mockResolvedValue(mockProfile);
    mockRepo.findByEmail.mockResolvedValue({
      id: 99,
      email: 'taken@test.com'
    } as never);

    await expect(
      userService.updateProfile(1, { email: 'taken@test.com' })
    ).rejects.toThrow(new AppError('Email is already in use', 409));
  });

  it('sets is_verified to false when email changes', async () => {
    mockRepo.findById.mockResolvedValue(mockProfile);
    mockRepo.findByEmail.mockResolvedValue(null);
    mockAuthRepo.invalidateUserTokens.mockResolvedValue({ count: 0 });
    mockAuthRepo.createVerificationToken.mockResolvedValue({} as never);
    mockRepo.update.mockResolvedValue(mockProfile as never);

    await userService.updateProfile(1, { email: 'new@test.com' });

    expect(mockRepo.update).toHaveBeenCalledWith(
      1,
      expect.objectContaining({
        email: 'new@test.com',
        is_verified: false
      })
    );
  });

  it('invalidates existing email_verification tokens before issuing a new one', async () => {
    mockRepo.findById.mockResolvedValue(mockProfile);
    mockRepo.findByEmail.mockResolvedValue(null);
    mockAuthRepo.invalidateUserTokens.mockResolvedValue({ count: 2 });
    mockAuthRepo.createVerificationToken.mockResolvedValue({} as never);
    mockRepo.update.mockResolvedValue(mockProfile as never);

    await userService.updateProfile(1, { email: 'new@test.com' });

    expect(mockAuthRepo.invalidateUserTokens).toHaveBeenCalledWith(
      1,
      'email_verification'
    );
  });

  it('creates a new verification token with correct arguments', async () => {
    mockRepo.findById.mockResolvedValue(mockProfile);
    mockRepo.findByEmail.mockResolvedValue(null);
    mockAuthRepo.invalidateUserTokens.mockResolvedValue({ count: 0 });
    mockAuthRepo.createVerificationToken.mockResolvedValue({} as never);
    mockRepo.update.mockResolvedValue(mockProfile as never);

    await userService.updateProfile(1, { email: 'new@test.com' });

    expect(mockAuthRepo.createVerificationToken).toHaveBeenCalledWith(
      1,
      'hashed_token',
      'email_verification',
      expect.any(Date)
    );
  });

  it('sends a verification email to the new address', async () => {
    mockRepo.findById.mockResolvedValue(mockProfile);
    mockRepo.findByEmail.mockResolvedValue(null);
    mockAuthRepo.invalidateUserTokens.mockResolvedValue({ count: 0 });
    mockAuthRepo.createVerificationToken.mockResolvedValue({} as never);
    mockRepo.update.mockResolvedValue(mockProfile as never);

    await userService.updateProfile(1, { email: 'new@test.com' });

    expect(authHelpers.sendVerificationEmail).toHaveBeenCalledWith(
      'new@test.com',
      'John',
      'raw_token'
    );
  });

  it('does not trigger re-verification when the submitted email is identical to the current one', async () => {
    mockRepo.findById.mockResolvedValue(mockProfile);
    mockRepo.update.mockResolvedValue(mockProfile as never);

    await userService.updateProfile(1, { email: 'john@test.com' }); // same email

    expect(mockRepo.findByEmail).not.toHaveBeenCalled();
    expect(mockAuthRepo.invalidateUserTokens).not.toHaveBeenCalled();
    expect(mockAuthRepo.createVerificationToken).not.toHaveBeenCalled();
    expect(authHelpers.sendVerificationEmail).not.toHaveBeenCalled();
  });
});

// userService.updateProfile — photo update

describe('userService.updateProfile — photo update', () => {
  it('updates profile_image and profile_image_public_id', async () => {
    const imageUrl =
      'https://res.cloudinary.com/test/image/upload/v1/profiles/user_1.jpg';
    const publicId = 'profiles/user_1';

    mockRepo.findById.mockResolvedValue(mockProfile);
    mockRepo.update.mockResolvedValue({
      ...mockProfile,
      profile_image: imageUrl
    } as never);

    await userService.updateProfile(1, {
      profile_image: imageUrl,
      profile_image_public_id: publicId
    });

    expect(mockRepo.update).toHaveBeenCalledWith(
      1,
      expect.objectContaining({
        profile_image: imageUrl,
        profile_image_public_id: publicId
      })
    );
  });
});
