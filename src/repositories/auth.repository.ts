import { Prisma, auth_provider } from '../../generated/prisma/client';
import { prisma } from '../config/prisma-client.config';
import { Tx } from '../types/auth';

type Db = Tx | typeof prisma;

export const authRepository = {
  findUserByEmail(email: string, db: Db = prisma) {
    return db.user.findUnique({ where: { email } });
  },

  findUserById<S extends Prisma.UserSelect>(
    id: number,
    select: S,
    db: Db = prisma
  ) {
    return db.user.findUnique({
      where: { id },
      select
    }) as Promise<Prisma.UserGetPayload<{ select: S }> | null>;
  },

  findUserByReferralCode(code: string, db: Db = prisma) {
    return db.user.findUnique({
      where: { referral_code: code },
      select: { id: true }
    });
  },

  createUser(data: Prisma.UserCreateInput, db: Db = prisma) {
    return db.user.create({ data });
  },

  updateUser(id: number, data: Prisma.UserUpdateInput, db: Db = prisma) {
    return db.user.update({ where: { id }, data });
  },

  findOAuthAccount(
    provider: auth_provider,
    providerUserId: string,
    db: Db = prisma
  ) {
    return db.userOAuthAccount.findUnique({
      where: {
        provider_provider_user_id: {
          provider,
          provider_user_id: providerUserId
        }
      },
      select: {
        user: {
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
        }
      }
    });
  },

  createOAuthAccount(
    data: {
      user_id: number;
      provider: auth_provider;
      provider_user_id: string;
      provider_email: string;
    },
    db: Db = prisma
  ) {
    return db.userOAuthAccount.create({ data });
  },

  findVerificationTokenByHash(hash: string, db: Db = prisma) {
    return db.verificationToken.findUnique({ where: { token: hash } });
  },

  createVerificationToken(
    userId: number,
    hash: string,
    type: string,
    expiresAt: Date,
    db: Db = prisma
  ) {
    return db.verificationToken.create({
      data: { user_id: userId, token: hash, type, expires_at: expiresAt }
    });
  },

  markTokenUsed(tokenId: number, db: Db = prisma) {
    return db.verificationToken.update({
      where: { id: tokenId },
      data: { is_used: true }
    });
  },

  invalidateUserTokens(userId: number, type: string, db: Db = prisma) {
    return db.verificationToken.updateMany({
      where: { user_id: userId, type, is_used: false },
      data: { is_used: true }
    });
  },

  findActiveReferralVoucher(db: Db = prisma) {
    return db.voucher.findFirst({
      where: {
        is_referral: true,
        deleted_at: null,
        expired_at: { gt: new Date() }
      }
    });
  },

  assignVoucherToUser(userId: number, voucherId: number, db: Db = prisma) {
    return db.userVoucher.create({
      data: { user_id: userId, voucher_id: voucherId }
    });
  }
};
