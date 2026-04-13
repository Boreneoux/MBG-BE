import { AppError } from '../utils/AppError';
import storeRepository from '../repositories/store.repository';

const EARTH_RADIUS_KM = 6371;

function haversineKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return EARTH_RADIUS_KM * 2 * Math.asin(Math.sqrt(a));
}

export const storeService = {
  async findNearest(lat?: number, lng?: number) {
    const stores = await storeRepository.findAllActive();

    if (!stores.length) {
      throw new AppError('No stores available', 404);
    }

    if (lat === undefined || lng === undefined) {
      return { store: stores[0], distance_km: null };
    }

    const withDistance = stores.map((store) => {
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

    return withDistance[0];
  },

  async getAll() {
    const stores = await storeRepository.findAllActive();
    return { stores };
  }
};
