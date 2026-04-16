import { Prisma, user_role } from '../../generated/prisma/client';
import { prisma } from '../config/prisma-client.config';

export const userRepository = {
  findAll(params: {
    skip?: number;
    take?: number;
    search?: string;
    role?: user_role;
  }) {
    const { skip, take, search, role } = params;

    const where: Prisma.UserWhereInput = {
      deleted_at: null,
      ...(role && { role }),
      ...(search && {
        OR: [
          { first_name: { contains: search, mode: 'insensitive' } },
          { last_name: { contains: search, mode: 'insensitive' } },
          { email: { contains: search, mode: 'insensitive' } }
        ]
      })
    };

    return prisma.$transaction([
      prisma.user.findMany({
        where,
        skip,
        take,
        orderBy: { created_at: 'desc' },
        select: {
          id: true,
          first_name: true,
          last_name: true,
          email: true,
          phone: true,
          role: true,
          is_verified: true,
          created_at: true,
          profile_image: true,
          store_admins: {
            select: { store: true }
          }
        }
      }),
      prisma.user.count({ where })
    ]);
  },

  findById(id: number) {
    return prisma.user.findUnique({
      where: { id, deleted_at: null },
      select: {
        id: true,
        first_name: true,
        last_name: true,
        email: true,
        phone: true,
        role: true,
        is_verified: true,
        created_at: true,
        profile_image: true,
        profile_image_public_id: true,
        store_admins: {
          select: { store: true }
        }
      }
    });
  },

  findByEmail(email: string) {
    return prisma.user.findUnique({
      where: { email, deleted_at: null }
    });
  },

  findByIdWithPassword(id: number) {
    return prisma.user.findUnique({
      where: { id, deleted_at: null },
      select: {
        id: true,
        email: true,
        first_name: true,
        last_name: true,
        password: true
      }
    });
  },

  create(data: Prisma.UserCreateInput) {
    return prisma.user.create({
      data,
      select: {
        id: true,
        first_name: true,
        last_name: true,
        email: true,
        role: true,
        created_at: true
      }
    });
  },

  update(id: number, data: Prisma.UserUpdateInput) {
    return prisma.user.update({
      where: { id },
      data,
      select: {
        id: true,
        first_name: true,
        last_name: true,
        email: true,
        role: true,
        updated_at: true
      }
    });
  },

  softDelete(id: number) {
    return prisma.user.update({
      where: { id },
      data: { deleted_at: new Date() }
    });
  }
};
