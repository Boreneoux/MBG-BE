import { userRepository } from '../repositories/user.repository';
import { authRepository } from '../repositories/auth.repository';
import storeRepository from '../repositories/store.repository';
import { AppError } from '../utils/AppError';
import { Prisma, user_role } from '../../generated/prisma/client';
import { TOKEN_EXPIRY } from '../types/auth';
import { UpdateProfileInput } from '../types/user';
import * as authHelpers from './auth.helpers';
import * as bcryptHelper from '../helpers/bcrypt.helper';
import logger from '../config/logger.config';

export const userService = {
  async getUsers(params: {
    page?: number;
    limit?: number;
    search?: string;
    role?: user_role;
  }) {
    const page = params.page || 1;
    const limit = params.limit || 10;
    const skip = (page - 1) * limit;

    const [users, total] = await userRepository.findAll({
      skip,
      take: limit,
      search: params.search,
      role: params.role
    });

    return {
      data: users,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    };
  },

  async getUserById(id: string) {
    const user = await userRepository.findById(id);
    if (!user) {
      throw new AppError('User not found', 404);
    }
    return user;
  },

  async createUser(data: any) {
    const existingUser = await userRepository.findByEmail(data.email);
    if (existingUser) {
      throw new AppError('Email is already registered', 400);
    }

    let storeName: string | undefined;
    if (data.role === user_role.store_admin && data.store_id) {
      const store = await storeRepository.findByIdWithDetails(data.store_id);
      if (!store) throw new AppError('Store not found', 404);
      storeName = store.name;
    }

    const userData: Prisma.UserCreateInput = {
      first_name: data.first_name,
      last_name: data.last_name,
      email: data.email,
      phone: data.phone,
      role: data.role || user_role.store_admin,
      is_verified: false
    };

    const user = await userRepository.create(userData);

    if (data.role === user_role.store_admin && data.store_id) {
      await storeRepository.createAdmin(data.store_id, user.id);
    }

    // Issue a 24-hour verification token and send invitation email
    const { raw, hashed } = authHelpers.generateToken();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
    await authRepository.invalidateUserTokens(user.id, 'email_verification');
    await authRepository.createVerificationToken(
      user.id,
      hashed,
      'email_verification',
      expiresAt
    );

    if (storeName) {
      await authHelpers.sendStoreAdminInviteEmail(
        data.email,
        data.first_name ?? '',
        storeName,
        raw
      );
    } else {
      authHelpers.sendVerificationEmail(data.email, data.first_name ?? '', raw);
    }

    return user;
  },

  async updateUser(id: string, data: any) {
    const user = await userRepository.findById(id);
    if (!user) {
      throw new AppError('User not found', 404);
    }

    // Email and password updates are handled by separate endpoints to avoid auth complexity.
    const updateData: Prisma.UserUpdateInput = {
      first_name: data.first_name,
      last_name: data.last_name,
      phone: data.phone,
      is_verified: data.is_verified
    };

    return userRepository.update(id, updateData);
  },

  async changeRole(id: string, newRole: user_role) {
    const user = await userRepository.findById(id);
    if (!user) {
      throw new AppError('User not found', 404);
    }

    if (user.role === newRole) {
      throw new AppError(`User is already a ${newRole}`, 400);
    }

    return userRepository.update(id, { role: newRole });
  },

  async deleteUser(id: string) {
    const user = await userRepository.findById(id);
    if (!user) {
      throw new AppError('User not found', 404);
    }

    return userRepository.softDelete(id);
  },

  async getProfile(userId: string) {
    const user = await userRepository.findById(userId);
    if (!user) {
      throw new AppError('User not found', 404);
    }
    return user;
  },

  async updateProfile(userId: string, data: UpdateProfileInput) {
    const user = await userRepository.findById(userId);
    if (!user) {
      throw new AppError('User not found', 404);
    }

    const updateData: Prisma.UserUpdateInput = {};

    if (data.first_name !== undefined) updateData.first_name = data.first_name;
    if (data.last_name !== undefined) updateData.last_name = data.last_name;
    if (data.phone !== undefined) updateData.phone = data.phone;
    if (data.profile_image !== undefined)
      updateData.profile_image = data.profile_image;
    if (data.profile_image_public_id !== undefined)
      updateData.profile_image_public_id = data.profile_image_public_id;

    // Password change
    if (data.new_password) {
      if (!data.current_password) {
        throw new AppError('Current password is required', 400);
      }

      const userWithPassword =
        await userRepository.findByIdWithPassword(userId);
      if (!userWithPassword?.password) {
        throw new AppError(
          'Cannot change password for accounts linked via social login',
          400
        );
      }

      const isMatch = await bcryptHelper.hashMatch(
        data.current_password,
        userWithPassword.password
      );
      if (!isMatch) {
        throw new AppError('Current password is incorrect', 400);
      }

      updateData.password = await bcryptHelper.hashing(data.new_password);
    }

    // Email change — triggers re-verification
    if (data.email && data.email !== user.email) {
      const existing = await userRepository.findByEmail(data.email);
      if (existing) {
        throw new AppError('Email is already in use', 409);
      }

      updateData.email = data.email;
      updateData.is_verified = false;

      const { raw, hashed } = authHelpers.generateToken();
      const expiresAt = new Date(
        Date.now() + TOKEN_EXPIRY.email_verification * 60 * 1000
      );

      await authRepository.invalidateUserTokens(userId, 'email_verification');
      await authRepository.createVerificationToken(
        userId,
        hashed,
        'email_verification',
        expiresAt
      );
      authHelpers.sendVerificationEmail(data.email, user.first_name ?? '', raw);

      logger.info(
        `Email change initiated for user ${userId} — verification sent to ${data.email}`
      );
    }

    return userRepository.update(userId, updateData);
  }
};
