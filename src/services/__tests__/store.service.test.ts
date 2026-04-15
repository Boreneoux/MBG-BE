import { storeService } from '../store.service';
import storeRepository from '../../repositories/store.repository';
import { AppError } from '../../utils/AppError';

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
  }
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
    mockRepo.findAllActive.mockResolvedValue(stores);

    const result = await storeService.getAll();

    expect(result.stores).toHaveLength(3);
    expect(result.stores[0].id).toBe(1);
  });

  it('returns empty array when no stores exist', async () => {
    mockRepo.findAllActive.mockResolvedValue([]);

    const result = await storeService.getAll();

    expect(result.stores).toEqual([]);
  });
});
