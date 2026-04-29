import { Prisma } from '../../generated/prisma/client';
import { prisma } from '../config/prisma-client.config';

export const userAddressRepository = {
  findAllByUserId(userId: string) {
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

  countByUserId(userId: string) {
    return prisma.userAddress.count({
      where: { user_id: userId, deleted_at: null }
    });
  },

  findByIdAndUserId(id: string, userId: string) {
    return prisma.userAddress.findFirst({
      where: { id, user_id: userId, deleted_at: null }
    });
  },

  create(data: Prisma.UserAddressUncheckedCreateInput) {
    return prisma.userAddress.create({ data });
  },

  update(id: string, data: Prisma.UserAddressUncheckedUpdateInput) {
    return prisma.userAddress.update({ where: { id }, data });
  },

  softDelete(id: string) {
    return prisma.userAddress.update({
      where: { id },
      data: { deleted_at: new Date() }
    });
  },

  async unsetAllPrimary(userId: string) {
    await prisma.userAddress.updateMany({
      where: { user_id: userId, deleted_at: null },
      data: { is_primary: false }
    });
  },

  async setFirstAddressAsPrimary(userId: string) {
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
