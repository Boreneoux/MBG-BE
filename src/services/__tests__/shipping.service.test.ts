import { shippingService } from '../shipping.service';
import shippingRepository from '../../repositories/shipping.repository';
import storeRepository from '../../repositories/store.repository';
import { AppError } from '../../utils/AppError';
import axios from 'axios';

jest.mock('../../repositories/shipping.repository');
jest.mock('../../repositories/store.repository');
jest.mock('axios');
jest.mock('../../config/logger.config', () => ({
  __esModule: true,
  default: { info: jest.fn(), error: jest.fn(), warn: jest.fn() }
}));

const mockShippingRepo = jest.mocked(shippingRepository);
const mockStoreRepo = jest.mocked(storeRepository);
const mockAxios = jest.mocked(axios);

// ─── Fixtures ────────────────────────────────────────────────────────────────

const toDecimal = (n: number) => ({ toNumber: () => n }) as any;

// Monas, Jakarta Pusat
const STORE_LAT = -6.1754;
const STORE_LNG = 106.8272;

// South Jakarta — ~2.7 km from store (within 15 km max)
const NEAR_LAT = -6.2;
const NEAR_LNG = 106.8;

// Surabaya — ~664 km from store (exceeds any reasonable max)
const FAR_LAT = -7.2575;
const FAR_LNG = 112.7521;

const makeStore = (overrides: Record<string, any> = {}) => ({
  id: 1,
  name: 'Store Pusat',
  address: 'Jl. Monas No. 1',
  district_id: 1,
  city_id: 1,
  province_id: 1,
  postal_code: '10110',
  latitude: toDecimal(STORE_LAT),
  longitude: toDecimal(STORE_LNG),
  max_delivery_distance: toDecimal(15),
  created_at: new Date(),
  updated_at: new Date(),
  deleted_at: null,
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
  ...overrides
});

const makeAddress = (overrides: Record<string, any> = {}) => ({
  id: 1,
  user_id: 10,
  label: 'Rumah',
  recipient_name: 'John Doe',
  phone: '08123456789',
  address: 'Jl. Dekat No. 5',
  district_id: 2,
  city_id: 2,
  province_id: 1,
  postal_code: '12345',
  latitude: toDecimal(NEAR_LAT),
  longitude: toDecimal(NEAR_LNG),
  geocode_provider: null,
  geocoded_at: null,
  geocoding_status: null,
  is_primary: true,
  created_at: new Date(),
  updated_at: new Date(),
  deleted_at: null,
  city: {
    id: 2,
    province_id: 1,
    rajaongkir_city_id: 154,
    type: 'Kota',
    name: 'Jakarta Selatan',
    postal_code: '12000',
    created_at: new Date(),
    updated_at: new Date(),
    deleted_at: null
  },
  ...overrides
});

// Komerce flat response — one entry per service, cost is a plain number
const CACHED_RESULTS = [
  { name: 'Jalur Nugraha Ekakurir (JNE)', code: 'jne', service: 'OKE', description: 'Ongkos Kirim Ekonomis', cost: 9000, etd: '4-5 day' },
  { name: 'Jalur Nugraha Ekakurir (JNE)', code: 'jne', service: 'REG', description: 'Layanan Reguler', cost: 11000, etd: '2-3 day' }
];

const makeCache = (overrides: Record<string, any> = {}) => ({
  id: 1,
  origin_city_id: 151,
  destination_city_id: 154,
  weight: 1000,
  courier: 'jne',
  result: CACHED_RESULTS,
  created_at: new Date(),
  expires_at: new Date(Date.now() + 60 * 60 * 1000), // 1 hour from now — fresh
  ...overrides
});

const komerceSuccessBody = {
  meta: { message: 'Success Calculate Domestic Shipping cost', code: 200, status: 'success' },
  data: CACHED_RESULTS
};

const defaultInput = {
  store_id: 1,
  address_id: 1,
  user_id: 10,
  weight: 1000,
  courier: 'jne'
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function mockApiSuccess() {
  mockAxios.post.mockResolvedValue({ data: komerceSuccessBody });
}

beforeEach(() => {
  jest.clearAllMocks();
});

// ─── shippingService.calculate ───────────────────────────────────────────────

describe('shippingService.calculate', () => {
  // ── Guard: store existence ─────────────────────────────────────────────────

  it('throws 404 when the store does not exist', async () => {
    mockStoreRepo.findById.mockResolvedValue(null);

    await expect(shippingService.calculate(defaultInput)).rejects.toThrow(
      new AppError('Store not found', 404)
    );

    expect(mockShippingRepo.findUserAddress).not.toHaveBeenCalled();
  });

  // ── Guard: address existence ───────────────────────────────────────────────

  it('throws 404 when the user address does not exist', async () => {
    mockStoreRepo.findById.mockResolvedValue(makeStore());
    mockShippingRepo.findUserAddress.mockResolvedValue(null);

    await expect(shippingService.calculate(defaultInput)).rejects.toThrow(
      new AppError('Address not found', 404)
    );
  });

  // ── Guard: address ownership ───────────────────────────────────────────────

  it('throws 403 when the address does not belong to the requesting user', async () => {
    mockStoreRepo.findById.mockResolvedValue(makeStore());
    mockShippingRepo.findUserAddress.mockResolvedValue(makeAddress({ user_id: 99 }));

    await expect(shippingService.calculate(defaultInput)).rejects.toThrow(
      new AppError('Address does not belong to this user', 403)
    );
  });

  // ── Guard: delivery distance ───────────────────────────────────────────────

  it('throws 422 when user address is beyond the store max_delivery_distance', async () => {
    mockStoreRepo.findById.mockResolvedValue(
      makeStore({ max_delivery_distance: toDecimal(5) }) // 5 km max
    );
    mockShippingRepo.findUserAddress.mockResolvedValue(
      makeAddress({ latitude: toDecimal(FAR_LAT), longitude: toDecimal(FAR_LNG) }) // ~664 km away
    );

    await expect(shippingService.calculate(defaultInput)).rejects.toThrow(
      new AppError("Delivery address is outside the store's delivery range", 422)
    );

    expect(mockAxios.post).not.toHaveBeenCalled();
  });

  it('does NOT throw 422 when user address is within max_delivery_distance', async () => {
    mockStoreRepo.findById.mockResolvedValue(
      makeStore({ latitude: toDecimal(0), longitude: toDecimal(0), max_delivery_distance: toDecimal(5) })
    );
    mockShippingRepo.findUserAddress.mockResolvedValue(
      makeAddress({ latitude: toDecimal(0), longitude: toDecimal(0) })
    );
    mockShippingRepo.findCachedCost.mockResolvedValue(null);
    mockShippingRepo.upsertCache.mockResolvedValue({} as any);
    mockApiSuccess();

    await expect(shippingService.calculate(defaultInput)).resolves.not.toThrow();
  });

  // ── Cache hit ──────────────────────────────────────────────────────────────

  it('returns cached options without calling the API when fresh cache exists', async () => {
    mockStoreRepo.findById.mockResolvedValue(makeStore());
    mockShippingRepo.findUserAddress.mockResolvedValue(makeAddress());
    mockShippingRepo.findCachedCost.mockResolvedValue(makeCache());

    const result = await shippingService.calculate(defaultInput);

    expect(mockAxios.post).not.toHaveBeenCalled();
    expect(mockShippingRepo.upsertCache).not.toHaveBeenCalled();
    expect(result.options.length).toBeGreaterThan(0);
  });

  it('re-fetches from API when cache is expired', async () => {
    mockStoreRepo.findById.mockResolvedValue(makeStore());
    mockShippingRepo.findUserAddress.mockResolvedValue(makeAddress());
    mockShippingRepo.findCachedCost.mockResolvedValue(
      makeCache({ expires_at: new Date(Date.now() - 1000) }) // expired
    );
    mockShippingRepo.upsertCache.mockResolvedValue({} as any);
    mockApiSuccess();

    await shippingService.calculate(defaultInput);

    expect(mockAxios.post).toHaveBeenCalledTimes(1);
    expect(mockShippingRepo.upsertCache).toHaveBeenCalledTimes(1);
  });

  // ── Cache miss → API call ──────────────────────────────────────────────────

  it('calls RajaOngkir API with correct parameters when no cache exists', async () => {
    mockStoreRepo.findById.mockResolvedValue(makeStore());
    mockShippingRepo.findUserAddress.mockResolvedValue(makeAddress());
    mockShippingRepo.findCachedCost.mockResolvedValue(null);
    mockShippingRepo.upsertCache.mockResolvedValue({} as any);
    mockApiSuccess();

    await shippingService.calculate(defaultInput);

    expect(mockAxios.post).toHaveBeenCalledTimes(1);

    const [, body] = mockAxios.post.mock.calls[0];
    const params = new URLSearchParams(body as string);

    expect(params.get('origin')).toBe('151');       // store's rajaongkir_city_id
    expect(params.get('destination')).toBe('154');  // address's rajaongkir_city_id
    expect(params.get('weight')).toBe('1000');
    expect(params.get('courier')).toBe('jne');
  });

  it('saves result to cache after a successful API call', async () => {
    mockStoreRepo.findById.mockResolvedValue(makeStore());
    mockShippingRepo.findUserAddress.mockResolvedValue(makeAddress());
    mockShippingRepo.findCachedCost.mockResolvedValue(null);
    mockShippingRepo.upsertCache.mockResolvedValue({} as any);
    mockApiSuccess();

    await shippingService.calculate(defaultInput);

    expect(mockShippingRepo.upsertCache).toHaveBeenCalledWith(
      expect.objectContaining({
        origin_city_id: 151,
        destination_city_id: 154,
        weight: 1000,
        courier: 'jne'
      })
    );
  });

  // ── Response shape ─────────────────────────────────────────────────────────

  it('returns a flat list of shipping options with correct shape', async () => {
    mockStoreRepo.findById.mockResolvedValue(makeStore());
    mockShippingRepo.findUserAddress.mockResolvedValue(makeAddress());
    mockShippingRepo.findCachedCost.mockResolvedValue(null);
    mockShippingRepo.upsertCache.mockResolvedValue({} as any);
    mockApiSuccess();

    const result = await shippingService.calculate(defaultInput);

    expect(result.options).toHaveLength(2); // OKE + REG
    expect(result.options[0]).toMatchObject({
      courier: 'jne',
      service: 'OKE',
      description: 'Ongkos Kirim Ekonomis',
      cost: 9000,
      etd: '4-5 day'
    });
    expect(result.options[1]).toMatchObject({
      courier: 'jne',
      service: 'REG',
      description: 'Layanan Reguler',
      cost: 11000,
      etd: '2-3 day'
    });
  });

  it('includes distance_km in the result', async () => {
    mockStoreRepo.findById.mockResolvedValue(makeStore());
    mockShippingRepo.findUserAddress.mockResolvedValue(makeAddress());
    mockShippingRepo.findCachedCost.mockResolvedValue(null);
    mockShippingRepo.upsertCache.mockResolvedValue({} as any);
    mockApiSuccess();

    const result = await shippingService.calculate(defaultInput);

    expect(result.distance_km).toBeGreaterThan(0);
    expect(result.distance_km).toBeLessThan(15);
  });

  it('rounds distance_km to 2 decimal places', async () => {
    mockStoreRepo.findById.mockResolvedValue(makeStore());
    mockShippingRepo.findUserAddress.mockResolvedValue(makeAddress());
    mockShippingRepo.findCachedCost.mockResolvedValue(null);
    mockShippingRepo.upsertCache.mockResolvedValue({} as any);
    mockApiSuccess();

    const result = await shippingService.calculate(defaultInput);

    const decimals = result.distance_km.toString().split('.')[1] ?? '';
    expect(decimals.length).toBeLessThanOrEqual(2);
  });

  // ── API error handling ─────────────────────────────────────────────────────

  it('throws 502 when axios throws (HTTP error or network failure)', async () => {
    mockStoreRepo.findById.mockResolvedValue(makeStore());
    mockShippingRepo.findUserAddress.mockResolvedValue(makeAddress());
    mockShippingRepo.findCachedCost.mockResolvedValue(null);
    mockAxios.post.mockRejectedValue(new Error('Request failed with status code 500'));

    await expect(shippingService.calculate(defaultInput)).rejects.toThrow(
      new AppError('Shipping cost service is temporarily unavailable', 502)
    );

    expect(mockShippingRepo.upsertCache).not.toHaveBeenCalled();
  });

  it('throws 502 when RajaOngkir returns an error code in the response body', async () => {
    mockStoreRepo.findById.mockResolvedValue(makeStore());
    mockShippingRepo.findUserAddress.mockResolvedValue(makeAddress());
    mockShippingRepo.findCachedCost.mockResolvedValue(null);
    mockAxios.post.mockResolvedValue({
      data: {
        meta: { message: 'Bad Request — invalid city', code: 400, status: 'error' },
        data: []
      }
    });

    await expect(shippingService.calculate(defaultInput)).rejects.toThrow(
      new AppError('Shipping cost service is temporarily unavailable', 502)
    );
  });

  it('does not cache result when API call fails', async () => {
    mockStoreRepo.findById.mockResolvedValue(makeStore());
    mockShippingRepo.findUserAddress.mockResolvedValue(makeAddress());
    mockShippingRepo.findCachedCost.mockResolvedValue(null);
    mockAxios.post.mockRejectedValue(new Error('ECONNREFUSED'));

    await expect(shippingService.calculate(defaultInput)).rejects.toThrow(AppError);

    expect(mockShippingRepo.upsertCache).not.toHaveBeenCalled();
  });
});
