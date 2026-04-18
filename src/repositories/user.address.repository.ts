import { Prisma } from '../../generated/prisma/client';
import { prisma } from '../config/prisma-client.config';

export const userAddressRepository = {
  findAllByUserId(userId: number) {
    return prisma.userAddress.findMany({
      where: { user_id: userId, deleted_at: null },
      orderBy: [{ is_primary: 'desc' }, { created_at: 'asc' }],
      include: {
        province: { select: { id: true, name: true } },
        city:     { select: { id: true, name: true, type: true } },
        district: { select: { id: true, name: true } }
      }
    });
  },

  countByUserId(userId: number) {
    return prisma.userAddress.count({
      where: { user_id: userId, deleted_at: null }
    });
  },

  findByIdAndUserId(id: number, userId: number) {
    return prisma.userAddress.findFirst({
      where: { id, user_id: userId, deleted_at: null }
    });
  },

  create(data: Prisma.UserAddressUncheckedCreateInput) {
    return prisma.userAddress.create({ data });
  },

  update(id: number, data: Prisma.UserAddressUncheckedUpdateInput) {
    return prisma.userAddress.update({ where: { id }, data });
  },

  softDelete(id: number) {
    return prisma.userAddress.update({
      where: { id },
      data: { deleted_at: new Date() }
    });
  },

  async unsetAllPrimary(userId: number) {
    await prisma.userAddress.updateMany({
      where: { user_id: userId, deleted_at: null },
      data: { is_primary: false }
    });
  },

  async setFirstAddressAsPrimary(userId: number) {
    const oldest = await prisma.userAddress.findFirst({
      where: { user_id: userId, deleted_at: null },
      orderBy: { created_at: 'asc' }
    });

    if (oldest) {
      await prisma.userAddress.update({
        where: { id: oldest.id },
        data: { is_primary: true }
      });
    }
  }
};
