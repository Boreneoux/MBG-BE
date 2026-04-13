import { prisma } from '../config/prisma-client.config';

const storeRepository = {
  findAllActive() {
    return prisma.store.findMany({
      where: { deleted_at: null },
      include: { province: true, city: true, district: true },
      orderBy: { id: 'asc' }
    });
  }
};

export default storeRepository;
