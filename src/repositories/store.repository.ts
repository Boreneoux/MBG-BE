import { prisma } from '../config/prisma-client.config';

const storeRepository = {
  findAllActive() {
    return prisma.store.findMany({
      where: { deleted_at: null },
      include: { province: true, city: true, district: true },
      orderBy: { id: 'asc' }
    });
  },

  findAllActiveForRouting() {
    return prisma.store.findMany({
      where: { deleted_at: null },
      select: { id: true, name: true, latitude: true, longitude: true },
      orderBy: { id: 'asc' }
    });
  },

  async findById(id: number) {
    const store = await prisma.store.findUnique({
      where: { id },
      include: { city: true }
    });
    return store?.deleted_at ? null : store;
  }
};

export default storeRepository;
