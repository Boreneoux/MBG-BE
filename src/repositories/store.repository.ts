import { prisma } from '../config/prisma-client.config';

const storeRepository = {
  findAllActive() {
    return prisma.store.findMany({
      where: { deleted_at: null },
      include: { province: true, city: true, district: true },
      orderBy: { id: 'asc' }
    });
  },

  findById(id: number) {
    return prisma.store.findFirst({
      where: { id, deleted_at: null },
      include: { city: true }
    });
  }
};

export default storeRepository;
