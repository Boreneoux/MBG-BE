import bcrypt from 'bcrypt';
import { userRepository } from '../repositories/user.repository';
import { AppError } from '../utils/AppError';
import { Prisma, user_role } from '../../generated/prisma/client';

export class UserService {
    async getUsers(params: {
        page?: number;
        limit?: number;
        search?: string;
        role?: user_role;
    }) {
        const page = params.page || 1;
        const limit = params.limit || 10;
        const skip = (page - 1) * limit;

        const { users, total } = await userRepository.findAll({
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
    }

    async getUserById(id: number) {
        const user = await userRepository.findById(id);
        if (!user) {
            throw new AppError('User not found', 404);
        }
        return user;
    }

    async createUser(data: any) {
        // Check if email exists
        const existingUser = await userRepository.findByEmail(data.email);
        if (existingUser) {
            throw new AppError('Email is already registered', 400);
        }

        const hashedPassword = await bcrypt.hash(data.password, 10);

        const userData: Prisma.UserCreateInput = {
            first_name: data.first_name,
            last_name: data.last_name,
            email: data.email,
            password: hashedPassword,
            phone: data.phone,
            role: data.role || user_role.store_admin,
            is_verified: true, // Assuming admins created by super_admin are automatically verified
        };

        return userRepository.create(userData);
    }

    async updateUser(id: number, data: any) {
        const user = await userRepository.findById(id);
        if (!user) {
            throw new AppError('User not found', 404);
        }

        // Notice we do not update email or password in this general update method to prevent complex auth issues.
        // They can be added as separate endpoints if explicitly required.
        const updateData: Prisma.UserUpdateInput = {
            first_name: data.first_name,
            last_name: data.last_name,
            phone: data.phone,
            is_verified: data.is_verified
        };

        return userRepository.update(id, updateData);
    }

    async changeRole(id: number, newRole: user_role) {
        const user = await userRepository.findById(id);
        if (!user) {
            throw new AppError('User not found', 404);
        }

        if (user.role === newRole) {
            throw new AppError(`User is already a ${newRole}`, 400);
        }

        return userRepository.update(id, { role: newRole });
    }

    async deleteUser(id: number) {
        const user = await userRepository.findById(id);
        if (!user) {
            throw new AppError('User not found', 404);
        }

        // Additional checks can be added here, e.g. preventing a super user from deleting themselves
        return userRepository.softDelete(id);
    }
}

export const userService = new UserService();
