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
      orderBy: { created_at: 'asc' },
    });
  },

  async findAllActivePaginated(page: number, limit: number, search?: string) {
    const where = {
      deleted_at: null,
      ...(search && { name: { contains: search, mode: 'insensitive' as const } }),
    };
    const [stores, total] = await Promise.all([
      prisma.store.findMany({
        where,
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
        orderBy: { created_at: 'asc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.store.count({ where }),
    ]);
    return { stores, total };
  },

  findAllActiveForRouting() {
    return prisma.store.findMany({
      where: { deleted_at: null },
      select: { id: true, name: true, slug: true, latitude: true, longitude: true, max_delivery_distance: true },
      orderBy: { created_at: 'asc' }
    });
  },

  async findById(id: string) {
    const store = await prisma.store.findUnique({
      where: { id },
      include: { city: true }
    });
    return store?.deleted_at ? null : store;
  },

  findBySlug(slug: string) {
    return prisma.store.findFirst({
      where: { slug, deleted_at: null },
      include: { city: true }
    });
  },

  findByIdWithDetails(id: string) {
    return prisma.store.findFirst({
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
    slug: string;
    address: string;
    district_id: string;
    city_id: string;
    province_id: string;
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

  update(id: string, data: {
    name?: string;
    slug?: string;
    address?: string;
    district_id?: string;
    city_id?: string;
    province_id?: string;
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

  async softDelete(id: string): Promise<void> {
    await prisma.store.update({
      where: { id },
      data: { deleted_at: new Date() }
    });
  },

  findUserById(userId: string) {
    return prisma.user.findFirst({
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

  findAdminByStoreAndUser(storeId: string, userId: string) {
    return prisma.storeAdmin.findFirst({
      where: { store_id: storeId, user_id: userId, deleted_at: null }
    });
  },

  removeAdmin(storeId: string, userId: string) {
    return prisma.storeAdmin.deleteMany({
      where: { store_id: storeId, user_id: userId }
    });
  },

  createAdmin(storeId: string, userId: string) {
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
