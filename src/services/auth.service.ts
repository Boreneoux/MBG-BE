import { prisma } from '../config/prisma-client.config';
import { AppError } from '../utils/AppError';
import { hashing, hashMatch } from '../helpers/bcrypt.helper';
import logger from '../config/logger.config';
import { authRepository } from '../repositories/auth.repository';
import {
  RegisterInput,
  LoginInput,
  GoogleProfile,
  Tx,
  TOKEN_EXPIRY
} from '../types/auth';
import {
  generateToken,
  hashToken,
  buildTokenPair,
  parseDurationMs,
  generateReferralCode,
  sendVerificationEmail,
  sendResetEmail
} from './auth.helpers';
import { JWT_REFRESH_TOKEN_EXPIRY } from '../config/main.config';

// ─── Private helpers ─────────────────────────────────────────────────────────

async function resolveReferrer(referralCode?: string) {
  if (!referralCode) return null;
  const referrer = await authRepository.findUserByReferralCode(referralCode);
  if (!referrer) throw new AppError('Invalid referral code', 400);
  return referrer;
}

async function generateUniqueReferralCode(
  firstName: string,
  lastName: string
): Promise<string> {
  let code = generateReferralCode(firstName, lastName);
  while (await authRepository.findUserByReferralCode(code)) {
    code = generateReferralCode(firstName, lastName);
  }
  return code;
}

async function issueVerificationToken(
  userId: string,
  email: string,
  firstName: string
): Promise<void> {
  const { raw, hashed } = generateToken();
  const expiresAt = new Date(
    Date.now() + TOKEN_EXPIRY.email_verification * 60 * 1000
  );
  await authRepository.createVerificationToken(
    userId,
    hashed,
    'email_verification',
    expiresAt
  );
  sendVerificationEmail(email, firstName, raw);
}

async function validateToken(rawToken: string, expectedType: string) {
  const hashed = hashToken(rawToken);
  const record = await authRepository.findVerificationTokenByHash(hashed);
  if (!record || record.type !== expectedType)
    throw new AppError('Invalid or expired link', 400);
  if (record.is_used)
    throw new AppError('This link has already been used', 400);
  if (new Date(record.expires_at) < new Date())
    throw new AppError('This link has expired', 400);
  return record;
}

async function issueTokenPair(userId: string, email: string, role: string) {
  const { accessToken, refreshToken } = buildTokenPair(userId, email, role as any);
  const expiresAt = new Date(Date.now() + parseDurationMs(JWT_REFRESH_TOKEN_EXPIRY));
  await authRepository.createRefreshToken(userId, refreshToken.hashed, expiresAt);
  return { accessToken, rawRefreshToken: refreshToken.raw };
}

async function applyReferralVoucher(userId: string, tx: Tx): Promise<void> {
  const voucher = await authRepository.findActiveReferralVoucher(tx);
  if (voucher) await authRepository.assignVoucherToUser(userId, voucher.id, tx);
}

// ─── Service ──────────────────────────────────────────────────────────────────

export const authService = {
  async register(input: RegisterInput) {
    const { first_name, last_name, email, phone, referral_code } = input;

    if (await authRepository.findUserByEmail(email))
      throw new AppError('Email already in use', 409);

    const referrer = await resolveReferrer(referral_code);
    const newReferralCode = await generateUniqueReferralCode(
      first_name,
      last_name
    );

    const user = await prisma.$transaction(async (tx: Tx) => {
      const created = await authRepository.createUser(
        {
          first_name,
          last_name,
          email,
          phone,
          referral_code: newReferralCode,
          ...(referrer && { referred_by_id: referrer.id })
        },
        tx
      );
      if (referrer) await applyReferralVoucher(created.id, tx);
      return created;
    });

    await issueVerificationToken(user.id, email, first_name);
    logger.info(`New user registered: ${email}`);
    return { user: { id: user.id, email: user.email } };
  },

  async verifyEmail(rawToken: string, password: string) {
    const record = await validateToken(rawToken, 'email_verification');
    const hashedPassword = await hashing(password);
    await prisma.$transaction(async (tx: Tx) => {
      await authRepository.updateUser(
        record.user_id,
        { is_verified: true, password: hashedPassword },
        tx
      );
      await authRepository.markTokenUsed(record.id, tx);
    });
    logger.info(`Email verified for user id=${record.user_id}`);
  },

  async resendVerification(email: string) {
    const user = await authRepository.findUserByEmail(email);
    if (!user || user.deleted_at || user.is_verified)
      return {
        message: 'If that email exists, a verification link has been sent'
      };
    await authRepository.invalidateUserTokens(user.id, 'email_verification');
    await issueVerificationToken(user.id, email, user.first_name ?? 'there');
    return {
      message: 'If that email exists, a verification link has been sent'
    };
  },

  async login(input: LoginInput) {
    const { email, password } = input;
    const user = await authRepository.findUserByEmail(email);
    if (!user || user.deleted_at)
      throw new AppError('Invalid email or password', 401);
    if (!user.password)
      throw new AppError(
        'This account uses Google sign-in. Please continue with Google.',
        401
      );
    if (!(await hashMatch(password, user.password)))
      throw new AppError('Invalid email or password', 401);
    if (!user.is_verified)
      throw new AppError(
        'Please verify your email address before logging in',
        403
      );
    logger.info(`User logged in: ${email}`);
    const { password: _, ...userWithoutPassword } = user;
    const tokens = await issueTokenPair(user.id, user.email, user.role);
    return { user: userWithoutPassword, ...tokens };
  },

  async googleCallback(profile: GoogleProfile) {
    const { provider_user_id, provider_email, first_name, last_name } = profile;

    const existingOAuth = await authRepository.findOAuthAccount(
      'google',
      provider_user_id
    );
    if (existingOAuth) {
      let { user } = existingOAuth;
      if (!user.referral_code) {
        const referralCode = await generateUniqueReferralCode(
          user.first_name ?? first_name,
          user.last_name ?? last_name
        );
        await authRepository.updateUser(user.id, { referral_code: referralCode });
        user = { ...user, referral_code: referralCode };
      }
      const tokens = await issueTokenPair(user.id, user.email, user.role);
      return { user, ...tokens, isNewUser: false };
    }

    const existingUser = await authRepository.findUserByEmail(provider_email);
    if (existingUser) {
      await authRepository.createOAuthAccount({
        user_id: existingUser.id,
        provider: 'google',
        provider_user_id,
        provider_email
      });
      if (!existingUser.is_verified)
        await authRepository.updateUser(existingUser.id, { is_verified: true });

      if (!existingUser.referral_code) {
        const referralCode = await generateUniqueReferralCode(
          existingUser.first_name ?? first_name,
          existingUser.last_name ?? last_name
        );
        await authRepository.updateUser(existingUser.id, { referral_code: referralCode });
        existingUser.referral_code = referralCode;
      }

      const { password: _, ...user } = existingUser;
      const tokens = await issueTokenPair(existingUser.id, existingUser.email, existingUser.role);
      return { user, ...tokens, isNewUser: false };
    }

    logger.info(`New user via Google OAuth: ${provider_email}`);
    const referralCode = await generateUniqueReferralCode(
      first_name,
      last_name
    );
    const newUser = await prisma.$transaction(async (tx: Tx) => {
      const created = await authRepository.createUser(
        {
          first_name,
          last_name,
          email: provider_email,
          is_verified: true,
          referral_code: referralCode
        },
        tx
      );
      await authRepository.createOAuthAccount(
        {
          user_id: created.id,
          provider: 'google',
          provider_user_id,
          provider_email
        },
        tx
      );
      return created;
    });
    const { password: _, ...user } = newUser;
    const tokens = await issueTokenPair(newUser.id, newUser.email, newUser.role);
    return { user, ...tokens, isNewUser: true };
  },

  async completeProfile(
    userId: string,
    input: { phone: string; referral_code?: string }
  ) {
    const { phone, referral_code } = input;
    const user = await authRepository.findUserById(userId, {
      id: true,
      phone: true
    });
    if (!user) throw new AppError('User not found', 404);
    if (user.phone) throw new AppError('Profile already completed', 400);

    const referrer = await resolveReferrer(referral_code);

    const updatedUser = await prisma.$transaction(async (tx: Tx) => {
      const updated = await authRepository.updateUser(
        userId,
        { phone, ...(referrer && { referred_by_id: referrer.id }) },
        tx
      );
      if (referrer) await applyReferralVoucher(userId, tx);
      return updated;
    });
    return { user: updatedUser };
  },

  async setupPassword(userId: string, password: string) {
    const user = await authRepository.findUserById(userId, {
      id: true,
      password: true
    });
    if (!user) throw new AppError('User not found', 404);
    if (user.password)
      throw new AppError('A password is already set on this account', 400);
    const hashedPassword = await hashing(password);
    await authRepository.updateUser(userId, { password: hashedPassword });
    return { message: 'Password set successfully' };
  },

  async getMe(userId: string) {
    const user = await authRepository.findUserById(userId, {
      id: true,
      first_name: true,
      last_name: true,
      email: true,
      phone: true,
      profile_image: true,
      role: true,
      is_verified: true,
      referral_code: true,
      created_at: true
    });
    if (!user) throw new AppError('User not found', 404);
    return user;
  },

  async forgotPassword(email: string) {
    const user = await authRepository.findUserByEmail(email);
    if (!user || user.deleted_at || !user.password)
      return { message: 'If that email exists, a reset link has been sent' };

    await authRepository.invalidateUserTokens(user.id, 'password_reset');
    const { raw, hashed } = generateToken();
    const expiresAt = new Date(
      Date.now() + TOKEN_EXPIRY.password_reset * 60 * 1000
    );
    await authRepository.createVerificationToken(
      user.id,
      hashed,
      'password_reset',
      expiresAt
    );
    sendResetEmail(email, user.first_name ?? 'there', raw);
    return { message: 'If that email exists, a reset link has been sent' };
  },

  async refreshToken(rawToken: string) {
    const hashed = hashToken(rawToken);
    const record = await authRepository.findRefreshTokenByHash(hashed);

    if (!record) throw new AppError('Invalid refresh token', 401);
    if (new Date(record.expires_at) < new Date())
      throw new AppError('Refresh token expired, please log in again', 401);

    const user = await authRepository.findUserById(record.user_id, {
      id: true,
      email: true,
      role: true
    });
    if (!user) throw new AppError('User not found', 404);

    // Rotate: revoke old token, issue a new pair
    await authRepository.deleteRefreshToken(record.id);
    const tokens = await issueTokenPair(user.id, user.email, user.role);
    return tokens;
  },

  async logout(rawToken: string) {
    const hashed = hashToken(rawToken);
    const record = await authRepository.findRefreshTokenByHash(hashed);
    if (record) await authRepository.deleteRefreshToken(record.id);
  },

  async resetPassword(rawToken: string, newPassword: string) {
    const record = await validateToken(rawToken, 'password_reset');
    const hashedPassword = await hashing(newPassword);
    await prisma.$transaction(async (tx: Tx) => {
      await authRepository.updateUser(
        record.user_id,
        { password: hashedPassword },
        tx
      );
      await authRepository.markTokenUsed(record.id, tx);
    });
    logger.info(`Password reset for user id=${record.user_id}`);
    return { message: 'Password has been reset successfully' };
  }
};
