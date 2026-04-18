import { prisma } from '../config/prisma-client.config';

const storeRepository = {
  findAllActive() {
    return prisma.store.findMany({
      where: { deleted_at: null },
      include: {
        province: true,
        city: true,
        district: true,
        store_admins: {
          where: { deleted_at: null },
          include: {
            user: { select: { id: true, first_name: true, last_name: true, email: true } },
          },
        },
      },
      orderBy: { id: 'asc' },
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
  },

  findByIdWithDetails(id: number) {
    return prisma.store.findUnique({
      where: { id, deleted_at: null },
      include: {
        province: true,
        city: true,
        district: true,
        store_admins: {
          where: { deleted_at: null },
          include: {
            user: { select: { id: true, first_name: true, last_name: true, email: true } },
          },
        },
      },
    });
  },

  create(data: {
    name: string;
    address: string;
    district_id: number;
    city_id: number;
    province_id: number;
    postal_code?: string;
    latitude: number;
    longitude: number;
    max_delivery_distance: number;
  }) {
    return prisma.store.create({
      data,
      include: { province: true, city: true, district: true }
    });
  },

  update(id: number, data: {
    name?: string;
    address?: string;
    district_id?: number;
    city_id?: number;
    province_id?: number;
    postal_code?: string;
    latitude?: number;
    longitude?: number;
    max_delivery_distance?: number;
  }) {
    return prisma.store.update({
      where: { id },
      data,
      include: { province: true, city: true, district: true }
    });
  },

  async softDelete(id: number): Promise<void> {
    await prisma.store.update({
      where: { id },
      data: { deleted_at: new Date() }
    });
  },

  findUserById(userId: number) {
    return prisma.user.findUnique({
      where: { id: userId, deleted_at: null },
      select: {
        id: true,
        first_name: true,
        last_name: true,
        email: true,
        role: true,
        deleted_at: true
      }
    });
  },

  findAdminByStoreAndUser(storeId: number, userId: number) {
    return prisma.storeAdmin.findUnique({
      where: { store_id_user_id: { store_id: storeId, user_id: userId } }
    });
  },

  createAdmin(storeId: number, userId: number) {
    return prisma.storeAdmin.create({
      data: { store_id: storeId, user_id: userId },
      include: {
        user: { select: { id: true, first_name: true, last_name: true, email: true } },
        store: { select: { id: true, name: true } }
      }
    });
  }
};

export default storeRepository;
