import { storeService } from '../store.service';
import storeRepository from '../../repositories/store.repository';
import { AppError } from '../../utils/AppError';
import { CreateStoreInput, UpdateStoreInput } from '../../types/store';

jest.mock('../../repositories/store.repository');

const mockRepo = jest.mocked(storeRepository);

const toDecimal = (n: number) => ({ toNumber: () => n }) as any;

// Lean fixture — matches the shape returned by findAllActiveForRouting (used by findNearest)
const makeLeanStore = (id: number, lat: number, lng: number) => ({
  id,
  name: `Store ${id}`,
  latitude: toDecimal(lat),
  longitude: toDecimal(lng)
});

// Full fixture — matches the shape returned by findAllActive (used by getAll)
const makeStore = (id: number, lat: number, lng: number) => ({
  id,
  name: `Store ${id}`,
  address: `Jl. Test No. ${id}`,
  district_id: 1,
  city_id: 1,
  province_id: 1,
  postal_code: '12345',
  latitude: toDecimal(lat),
  longitude: toDecimal(lng),
  max_delivery_distance: toDecimal(15),
  created_at: new Date(),
  updated_at: new Date(),
  deleted_at: null,
  province: {
    id: 1,
    rajaongkir_province_id: 6,
    name: 'DKI Jakarta',
    created_at: new Date(),
    updated_at: new Date(),
    deleted_at: null
  },
  city: {
    id: 1,
    province_id: 1,
    rajaongkir_city_id: 151,
    type: 'Kota',
    name: 'Jakarta Pusat',
    postal_code: '10000',
    created_at: new Date(),
    updated_at: new Date(),
    deleted_at: null
  },
  district: {
    id: 1,
    city_id: 1,
    rajaongkir_district_id: 1001,
    name: 'Gambir',
    created_at: new Date(),
    updated_at: new Date(),
    deleted_at: null
  },
  store_admins: []
});

beforeEach(() => jest.clearAllMocks());

// ─── storeService.findNearest ────────────────────────────────────────────────

describe('storeService.findNearest', () => {
  it('throws 404 when no stores exist', async () => {
    mockRepo.findAllActiveForRouting.mockResolvedValue([]);

    await expect(storeService.findNearest()).rejects.toThrow(
      new AppError('No stores available', 404)
    );
  });

  it('returns default store with distance_km null when no coordinates provided', async () => {
    const stores = [
      makeLeanStore(1, -6.1754, 106.8272),
      makeLeanStore(2, -7.2575, 112.7521)
    ];
    mockRepo.findAllActiveForRouting.mockResolvedValue(stores);

    const result = await storeService.findNearest();

    expect(result.store.id).toBe(1);
    expect(result.distance_km).toBeNull();
  });

  it('returns the only store with a calculated distance when one store exists', async () => {
    // Monas coords, user is ~2.7 km away in South Jakarta
    const stores = [makeLeanStore(1, -6.1754, 106.8272)];
    mockRepo.findAllActiveForRouting.mockResolvedValue(stores);

    const result = await storeService.findNearest(-6.2, 106.8);

    expect(result.store.id).toBe(1);
    expect(result.distance_km).toBeGreaterThan(0);
  });

  it('returns the nearest store out of multiple stores', async () => {
    // Store 1: Monas (~2.7 km from user), Store 2: Surabaya (~664 km from user)
    const storeNear = makeLeanStore(1, -6.1754, 106.8272);
    const storeFar = makeLeanStore(2, -7.2575, 112.7521);
    mockRepo.findAllActiveForRouting.mockResolvedValue([storeFar, storeNear]);

    // User at South Jakarta
    const result = await storeService.findNearest(-6.2, 106.8);

    expect(result.store.id).toBe(1);
    expect(result.distance_km).toBeLessThan(10);
  });

  it('returns distance_km of 0 when user is at the exact store location', async () => {
    const stores = [makeLeanStore(1, -6.2, 106.8)];
    mockRepo.findAllActiveForRouting.mockResolvedValue(stores);

    const result = await storeService.findNearest(-6.2, 106.8);

    expect(result.distance_km).toBe(0);
  });

  it('returns the store with lower ID when two stores are equidistant', async () => {
    // Both stores are exactly 1 longitude degree from user at (0, 0)
    // (0, 1) and (0, -1) produce the same Haversine distance
    const store1 = makeLeanStore(1, 0, 1);
    const store2 = makeLeanStore(2, 0, -1);
    // repo returns ordered by id asc — store1 comes first
    mockRepo.findAllActiveForRouting.mockResolvedValue([store1, store2]);

    const result = await storeService.findNearest(0, 0);

    expect(result.store.id).toBe(1);
  });

  it('rounds distance_km to 2 decimal places', async () => {
    const stores = [makeLeanStore(1, -6.1754, 106.8272)];
    mockRepo.findAllActiveForRouting.mockResolvedValue(stores);

    const result = await storeService.findNearest(-6.2, 106.8);

    const decimalPart = result.distance_km!.toString().split('.')[1] ?? '';
    expect(decimalPart.length).toBeLessThanOrEqual(2);
  });
});

// ─── storeService.getAll ─────────────────────────────────────────────────────

describe('storeService.getAll', () => {
  it('returns all active stores', async () => {
    const stores = [
      makeStore(1, -6.1754, 106.8272),
      makeStore(2, -6.2, 106.8),
      makeStore(3, -7.2575, 112.7521)
    ];
    mockRepo.findAllActivePaginated.mockResolvedValue({ stores, total: 3 });

    const result = await storeService.getAll();

    expect(result.stores).toHaveLength(3);
    expect(result.stores[0].id).toBe(1);
  });

  it('returns empty array when no stores exist', async () => {
    mockRepo.findAllActivePaginated.mockResolvedValue({ stores: [], total: 0 });

    const result = await storeService.getAll();

    expect(result.stores).toEqual([]);
  });
});

// ─── Shared fixtures for CRUD tests ──────────────────────────────────────────

const createInput: CreateStoreInput = {
  name: 'New Store',
  address: 'Jl. Baru No. 1',
  district_id: 1,
  city_id: 1,
  province_id: 1,
  postal_code: '12345',
  latitude: -6.1754,
  longitude: 106.8272,
  max_delivery_distance: 15
};

// Reuses makeStore which already includes province, city, district relations
const fullStore = makeStore(1, -6.1754, 106.8272);

const mockStoreAdminUser = {
  id: 10,
  first_name: 'Jane',
  last_name: 'Admin',
  email: 'jane.admin@test.com',
  role: 'store_admin' as const,
  deleted_at: null
};

const mockRegularUser = {
  ...mockStoreAdminUser,
  id: 11,
  role: 'user' as const
};

const mockStoreAdminRecord = {
  id: 1,
  store_id: 1,
  user_id: 10,
  created_at: new Date(),
  deleted_at: null,
  user: {
    id: 10,
    first_name: 'Jane',
    last_name: 'Admin',
    email: 'jane.admin@test.com'
  },
  store: { id: 1, name: 'Store 1' }
};

// ─── storeService.create ─────────────────────────────────────────────────────

describe('storeService.create', () => {
  it('creates a store with the provided input and returns it', async () => {
    mockRepo.create.mockResolvedValue(fullStore);

    const result = await storeService.create(createInput);

    expect(result.store).toEqual(fullStore);
    expect(mockRepo.create).toHaveBeenCalledWith(createInput);
  });

  it('propagates repository errors (e.g. FK violation) to the caller', async () => {
    mockRepo.create.mockRejectedValue(new Error('FK constraint'));

    await expect(storeService.create(createInput)).rejects.toThrow('FK constraint');
  });
});

// ─── storeService.getById ────────────────────────────────────────────────────

describe('storeService.getById', () => {
  it('returns store when found', async () => {
    mockRepo.findByIdWithDetails.mockResolvedValue(fullStore);

    const result = await storeService.getById(1);

    expect(result.store).toEqual(fullStore);
    expect(mockRepo.findByIdWithDetails).toHaveBeenCalledWith(1);
  });

  it('throws 404 when store does not exist', async () => {
    mockRepo.findByIdWithDetails.mockResolvedValue(null);

    await expect(storeService.getById(99)).rejects.toThrow(
      new AppError('Store not found', 404)
    );
  });

  it('throws 404 when store is soft-deleted', async () => {
    mockRepo.findByIdWithDetails.mockResolvedValue(null); // repo already returns null for deleted

    await expect(storeService.getById(1)).rejects.toThrow(
      new AppError('Store not found', 404)
    );
  });
});

// ─── storeService.update ─────────────────────────────────────────────────────

describe('storeService.update', () => {
  it('updates the store and returns the updated record', async () => {
    const updateData: UpdateStoreInput = { name: 'Renamed Store', max_delivery_distance: 20 };
    const updatedStore = { ...fullStore, name: 'Renamed Store', max_delivery_distance: toDecimal(20) };

    mockRepo.findByIdWithDetails.mockResolvedValue(fullStore);
    mockRepo.update.mockResolvedValue(updatedStore);

    const result = await storeService.update(1, updateData);

    expect(result.store).toEqual(updatedStore);
    expect(mockRepo.findByIdWithDetails).toHaveBeenCalledWith(1);
    expect(mockRepo.update).toHaveBeenCalledWith(1, updateData);
  });

  it('throws 404 when store does not exist', async () => {
    mockRepo.findByIdWithDetails.mockResolvedValue(null);

    await expect(storeService.update(99, { name: 'Ghost' })).rejects.toThrow(
      new AppError('Store not found', 404)
    );
    expect(mockRepo.update).not.toHaveBeenCalled();
  });

  it('does not call update when store is not found', async () => {
    mockRepo.findByIdWithDetails.mockResolvedValue(null);

    await expect(storeService.update(99, { latitude: -7 })).rejects.toThrow();
    expect(mockRepo.update).not.toHaveBeenCalled();
  });
});

// ─── storeService.delete ─────────────────────────────────────────────────────

describe('storeService.delete', () => {
  it('soft-deletes the store when found', async () => {
    mockRepo.findByIdWithDetails.mockResolvedValue(fullStore);
    mockRepo.softDelete.mockResolvedValue(undefined);

    await expect(storeService.delete(1)).resolves.toBeUndefined();
    expect(mockRepo.softDelete).toHaveBeenCalledWith(1);
  });

  it('throws 404 when store does not exist', async () => {
    mockRepo.findByIdWithDetails.mockResolvedValue(null);

    await expect(storeService.delete(99)).rejects.toThrow(
      new AppError('Store not found', 404)
    );
    expect(mockRepo.softDelete).not.toHaveBeenCalled();
  });

  it('does not call softDelete when store is not found', async () => {
    mockRepo.findByIdWithDetails.mockResolvedValue(null);

    await expect(storeService.delete(99)).rejects.toThrow();
    expect(mockRepo.softDelete).not.toHaveBeenCalled();
  });
});

// ─── storeService.assignAdmin ─────────────────────────────────────────────────

describe('storeService.assignAdmin', () => {
  it('assigns a store_admin user to a store and returns the record', async () => {
    mockRepo.findByIdWithDetails.mockResolvedValue(fullStore);
    mockRepo.findUserById.mockResolvedValue(mockStoreAdminUser);
    mockRepo.findAdminByStoreAndUser.mockResolvedValue(null);
    mockRepo.createAdmin.mockResolvedValue(mockStoreAdminRecord);

    const result = await storeService.assignAdmin(1, 10);

    expect(result.storeAdmin).toEqual(mockStoreAdminRecord);
    expect(mockRepo.findByIdWithDetails).toHaveBeenCalledWith(1);
    expect(mockRepo.findUserById).toHaveBeenCalledWith(10);
    expect(mockRepo.findAdminByStoreAndUser).toHaveBeenCalledWith(1, 10);
    expect(mockRepo.createAdmin).toHaveBeenCalledWith(1, 10);
  });

  it('throws 404 when store does not exist', async () => {
    mockRepo.findByIdWithDetails.mockResolvedValue(null);

    await expect(storeService.assignAdmin(99, 10)).rejects.toThrow(
      new AppError('Store not found', 404)
    );
    expect(mockRepo.findUserById).not.toHaveBeenCalled();
    expect(mockRepo.createAdmin).not.toHaveBeenCalled();
  });

  it('throws 404 when user does not exist', async () => {
    mockRepo.findByIdWithDetails.mockResolvedValue(fullStore);
    mockRepo.findUserById.mockResolvedValue(null);

    await expect(storeService.assignAdmin(1, 99)).rejects.toThrow(
      new AppError('User not found', 404)
    );
    expect(mockRepo.findAdminByStoreAndUser).not.toHaveBeenCalled();
    expect(mockRepo.createAdmin).not.toHaveBeenCalled();
  });

  it('throws 400 when user does not have store_admin role', async () => {
    mockRepo.findByIdWithDetails.mockResolvedValue(fullStore);
    mockRepo.findUserById.mockResolvedValue(mockRegularUser);

    await expect(storeService.assignAdmin(1, 11)).rejects.toThrow(
      new AppError('User does not have store_admin role', 400)
    );
    expect(mockRepo.findAdminByStoreAndUser).not.toHaveBeenCalled();
    expect(mockRepo.createAdmin).not.toHaveBeenCalled();
  });

  it('throws 409 when user is already assigned to this store', async () => {
    mockRepo.findByIdWithDetails.mockResolvedValue(fullStore);
    mockRepo.findUserById.mockResolvedValue(mockStoreAdminUser);
    mockRepo.findAdminByStoreAndUser.mockResolvedValue(mockStoreAdminRecord);

    await expect(storeService.assignAdmin(1, 10)).rejects.toThrow(
      new AppError('User is already assigned to this store', 409)
    );
    expect(mockRepo.createAdmin).not.toHaveBeenCalled();
  });
});
