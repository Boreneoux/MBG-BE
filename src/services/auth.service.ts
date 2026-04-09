import { prisma } from '../config/prisma-client.config';
import { AppError } from '../utils/AppError';
import { hashing, hashMatch } from '../helpers/bcrypt.helper';
import logger from '../config/logger.config';
import { GoogleProfile } from '../middlewares/auth.middleware';
import {
  RegisterInput,
  LoginInput,
  TOKEN_EXPIRY,
  Tx,
  buildCookieToken,
  getUniqueReferralCode,
  invalidateTokens,
  validateVerificationToken,
  validateReferrer,
  applyReferralVoucher,
  createVerificationToken,
  sendVerificationEmail,
  sendResetEmail
} from './auth.helpers';

async function createUserTx(
  data: Omit<RegisterInput, 'referral_code' | 'password'> & {
    referral_code: string;
    referred_by_id?: number;
  },
  referrer: { id: number } | null
) {
  return prisma.$transaction(async (tx: Tx) => {
    const user = await tx.user.create({ data });
    if (referrer) await applyReferralVoucher(tx, user.id);
    return user;
  });
}

async function issueVerification(
  userId: number,
  email: string,
  firstName: string
) {
  const raw = await createVerificationToken(
    userId,
    'email_verification',
    TOKEN_EXPIRY.email_verification
  );
  sendVerificationEmail(email, firstName, raw);
}

async function handleExistingOAuth(oAuth: { user: any }) {
  const token = buildCookieToken(
    oAuth.user.id,
    oAuth.user.email,
    oAuth.user.role
  );
  const { password: _, ...user } = oAuth.user;
  return { user, token, isNewUser: false };
}

async function linkGoogleAccount(
  existing: any,
  oAuthData: { provider_user_id: string; provider_email: string }
) {
  await prisma.userOAuthAccount.create({
    data: { user_id: existing.id, provider: 'google', ...oAuthData }
  });
  if (!existing.is_verified) {
    await prisma.user.update({
      where: { id: existing.id },
      data: { is_verified: true }
    });
  }
  const token = buildCookieToken(existing.id, existing.email, existing.role);
  const { password: _, ...user } = existing;
  return { user, token, isNewUser: false };
}

async function createGoogleUser(profile: GoogleProfile) {
  const {
    provider_user_id,
    provider_email: email,
    first_name,
    last_name
  } = profile;
  const referral_code = await getUniqueReferralCode(first_name, last_name);
  const newUser = await prisma.$transaction(async (tx: Tx) => {
    const created = await tx.user.create({
      data: { first_name, last_name, email, is_verified: true, referral_code }
    });
    await tx.userOAuthAccount.create({
      data: {
        user_id: created.id,
        provider: 'google',
        provider_user_id,
        provider_email: email
      }
    });
    return created;
  });
  const token = buildCookieToken(newUser.id, newUser.email, newUser.role);
  const { password: _, ...user } = newUser;
  return { user, token, isNewUser: true };
}

export const authService = {
  async register(input: RegisterInput) {
    const { first_name, last_name, email, phone, referral_code } = input;
    if (await prisma.user.findUnique({ where: { email } }))
      throw new AppError('Email already in use', 409);
    const referrer = referral_code ? await validateReferrer(referral_code) : null;
    const newReferralCode = await getUniqueReferralCode(first_name, last_name);
    const user = await createUserTx(
      { first_name, last_name, email, phone, referral_code: newReferralCode, ...(referrer && { referred_by_id: referrer.id }) },
      referrer
    );
    await issueVerification(user.id, email, first_name);
    logger.info(`New user registered: ${email}`);
    return { user: { id: user.id, email: user.email } };
  },

  // Verifies the email token and sets the password in one step
  async verifyEmail(rawToken: string, password: string) {
    const record = await validateVerificationToken(rawToken, 'email_verification');
    const hashedPassword = await hashing(password);
    await prisma.$transaction(async (tx: Tx) => {
      await tx.user.update({
        where: { id: record.user_id },
        data: { is_verified: true, password: hashedPassword }
      });
      await tx.verificationToken.update({ where: { id: record.id }, data: { is_used: true } });
    });
    logger.info(`Email verified + password set for user id=${record.user_id}`);
  },

  async resendVerification(email: string) {
    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        first_name: true,
        is_verified: true,
        deleted_at: true
      }
    });
    if (!user || user.deleted_at)
      return {
        message: 'If that email exists, a verification link has been sent'
      };
    if (user.is_verified)
      throw new AppError('Account is already verified', 400);
    await invalidateTokens(user.id, 'email_verification');
    await issueVerification(user.id, email, user.first_name ?? 'there');
    return {
      message: 'If that email exists, a verification link has been sent'
    };
  },

  async login(input: LoginInput) {
    const { email, password } = input;
    const user = await prisma.user.findUnique({ where: { email } });
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
    return {
      user: userWithoutPassword,
      token: buildCookieToken(user.id, user.email, user.role)
    };
  },

  async googleCallback(profile: GoogleProfile) {
    const { provider_user_id, provider_email } = profile;
    const existingOAuth = await prisma.userOAuthAccount.findUnique({
      where: {
        provider_provider_user_id: { provider: 'google', provider_user_id }
      },
      include: { user: true }
    });
    if (existingOAuth) return handleExistingOAuth(existingOAuth);
    const existingUser = await prisma.user.findUnique({
      where: { email: provider_email }
    });
    if (existingUser)
      return linkGoogleAccount(existingUser, {
        provider_user_id,
        provider_email
      });
    logger.info(`New user via Google OAuth: ${provider_email}`);
    return createGoogleUser(profile);
  },

  async completeProfile(
    userId: number,
    input: { phone: string; referral_code?: string }
  ) {
    const { phone, referral_code } = input;
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, phone: true }
    });
    if (!user) throw new AppError('User not found', 404);
    if (user.phone) throw new AppError('Profile already completed', 400);
    const referrer = referral_code
      ? await validateReferrer(referral_code)
      : null;
    const updatedUser = await prisma.$transaction(async (tx: Tx) => {
      const updated = await tx.user.update({
        where: { id: userId },
        data: { phone, ...(referrer && { referred_by_id: referrer.id }) },
        select: {
          id: true,
          first_name: true,
          last_name: true,
          email: true,
          phone: true,
          role: true,
          referral_code: true
        }
      });
      if (referrer) await applyReferralVoucher(tx, userId);
      return updated;
    });
    return { user: updatedUser };
  },

  // For Google OAuth users who want to add email/password login to their account
  async setupPassword(userId: number, password: string) {
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { id: true, password: true, email: true, role: true } });
    if (!user) throw new AppError('User not found', 404);
    if (user.password) throw new AppError('A password is already set on this account', 400);
    const hashedPassword = await hashing(password);
    await prisma.user.update({ where: { id: userId }, data: { password: hashedPassword } });
    return { message: 'Password set successfully' };
  },

  async getMe(userId: number) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
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
      }
    });
    if (!user) throw new AppError('User not found', 404);
    return user;
  },

  async forgotPassword(email: string) {
    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true, first_name: true, password: true, deleted_at: true }
    });
    if (!user || user.deleted_at || !user.password)
      return { message: 'If that email exists, a reset link has been sent' };
    await invalidateTokens(user.id, 'password_reset');
    const raw = await createVerificationToken(
      user.id,
      'password_reset',
      TOKEN_EXPIRY.password_reset
    );
    sendResetEmail(email, user.first_name ?? 'there', raw);
    return { message: 'If that email exists, a reset link has been sent' };
  },

  async resetPassword(rawToken: string, newPassword: string) {
    const record = await validateVerificationToken(rawToken, 'password_reset');
    const hashedPassword = await hashing(newPassword);
    await prisma.$transaction([
      prisma.user.update({
        where: { id: record.user_id },
        data: { password: hashedPassword }
      }),
      prisma.verificationToken.update({
        where: { id: record.id },
        data: { is_used: true }
      })
    ]);
    logger.info(`Password reset for user id=${record.user_id}`);
    return { message: 'Password has been reset successfully' };
  }
};
