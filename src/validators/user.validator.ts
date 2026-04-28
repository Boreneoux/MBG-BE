import { z } from 'zod';
import { user_role } from '../../generated/prisma/client';

export const createUserSchema = z.object({
    body: z.object({
        first_name: z.string().min(1, 'First name is required').max(50),
        last_name: z.string().max(50).optional(),
        email: z.string().email('Invalid email address').max(255),
        phone: z.string().max(20).optional(),
        role: z.enum([user_role.store_admin, user_role.user]).default(user_role.store_admin),
        store_id: z.string().uuid().optional(),
    })
});

export const updateUserSchema = z.object({
    body: z.object({
        first_name: z.string().min(1).max(50).optional(),
        last_name: z.string().max(50).optional(),
        phone: z.string().max(20).optional(),
        is_verified: z.boolean().optional()
    })
});

export const changeRoleSchema = z.object({
    body: z.object({
        role: z.enum([user_role.store_admin, user_role.user, user_role.super_admin])
    })
});

const passwordField = z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, {
        message: 'Password must contain at least one uppercase letter, one lowercase letter, and one number'
    });

export const updateProfileSchema = z
    .object({
        body: z
            .object({
                first_name: z.string().trim().min(1).max(50).optional(),
                last_name: z.string().trim().max(50).optional(),
                phone: z.string().trim().max(20).optional(),
                email: z
                    .string()
                    .trim()
                    .toLowerCase()
                    .email('Invalid email address')
                    .max(255)
                    .optional(),
                current_password: z.string().min(1).optional(),
                new_password: passwordField.optional()
            })
            .refine(
                (body) => !body.new_password || !!body.current_password,
                { message: 'Current password is required to set a new password', path: ['current_password'] }
            )
    });

export const getUsersQuerySchema = z.object({
    query: z.object({
        page: z.string().regex(/^\d+$/).optional(),
        limit: z.string().regex(/^\d+$/).optional(),
        search: z.string().optional(),
        role: z.enum([user_role.store_admin, user_role.user, user_role.super_admin]).optional()
    })
});
