import { AppError } from '../utils/AppError';
import storeRepository from '../repositories/store.repository';
import { haversineKm } from '../helpers/geo.helper';
import { CreateStoreInput, UpdateStoreInput } from '../types/store';
import { generateUniqueSlug } from '../utils/slug.helper';

export const storeService = {
  async findNearest(lat?: number, lng?: number) {
    const stores = await storeRepository.findAllActiveForRouting();

    if (!stores.length) {
      throw new AppError('No stores available', 404);
    }

    if (lat === undefined || lng === undefined) {
      return { store: stores[0], distance_km: null };
    }

    const withDistance = stores.map(store => {
      const rawKm = haversineKm(
        lat,
        lng,
        store.latitude.toNumber(),
        store.longitude.toNumber()
      );
      const distance_km = Math.round(rawKm * 100) / 100;
      return { store, distance_km };
    });

    withDistance.sort((a, b) => a.distance_km - b.distance_km);

    const nearest = withDistance[0];

    if (nearest.distance_km > nearest.store.max_delivery_distance.toNumber()) {
      throw new AppError(
        `No store delivers to your location. The nearest store is "${nearest.store.name}" (${nearest.distance_km.toFixed(1)} km away).`,
        404
      );
    }

    return nearest;
  },

  async getAll(page: number = 1, limit: number = 10, search?: string) {
    const { stores, total } = await storeRepository.findAllActivePaginated(page, limit, search);
    return {
      stores,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  },

  async create(data: CreateStoreInput) {
    const slug = await generateUniqueSlug(data.name, (s) =>
      storeRepository.findBySlug(s).then(Boolean)
    );
    const store = await storeRepository.create({ ...data, slug });
    return { store };
  },

  async getById(id: string) {
    const store = await storeRepository.findByIdWithDetails(id);
    if (!store) throw new AppError('Store not found', 404);
    return { store };
  },

  async getBySlug(slug: string) {
    const lean = await storeRepository.findBySlug(slug);
    if (!lean) throw new AppError('Store not found', 404);
    const store = await storeRepository.findByIdWithDetails(lean.id);
    if (!store) throw new AppError('Store not found', 404);
    return { store };
  },

  async update(slug: string, data: UpdateStoreInput) {
    const lean = await storeRepository.findBySlug(slug);
    if (!lean) throw new AppError('Store not found', 404);
    const id = lean.id;

    let newSlug: string | undefined;
    if (data.name && data.name !== lean.name) {
      newSlug = await generateUniqueSlug(data.name, (s) =>
        storeRepository.findBySlug(s).then(Boolean)
      );
    }

    const store = await storeRepository.update(id, { ...data, ...(newSlug && { slug: newSlug }) });
    return { store };
  },

  async delete(slug: string) {
    const lean = await storeRepository.findBySlug(slug);
    if (!lean) throw new AppError('Store not found', 404);
    await storeRepository.softDelete(lean.id);
  },

  async unassignAdmin(storeSlug: string, userId: string) {
    const lean = await storeRepository.findBySlug(storeSlug);
    if (!lean) throw new AppError('Store not found', 404);
    const storeId = lean.id;

    const user = await storeRepository.findUserById(userId);
    if (!user) throw new AppError('User not found', 404);

    const existing = await storeRepository.findAdminByStoreAndUser(storeId, userId);
    if (!existing) throw new AppError('User is not assigned to this store', 404);

    await storeRepository.removeAdmin(storeId, userId);
  },

  async assignAdmin(storeSlug: string, userId: string) {
    const lean = await storeRepository.findBySlug(storeSlug);
    if (!lean) throw new AppError('Store not found', 404);
    const storeId = lean.id;

    const user = await storeRepository.findUserById(userId);
    if (!user) throw new AppError('User not found', 404);

    if (user.role !== 'store_admin') {
      throw new AppError('User does not have store_admin role', 400);
    }

    const existing = await storeRepository.findAdminByStoreAndUser(storeId, userId);
    if (existing) throw new AppError('User is already assigned to this store', 409);

    const storeAdmin = await storeRepository.createAdmin(storeId, userId);
    return { storeAdmin };
  }
};
