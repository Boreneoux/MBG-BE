import { AppError } from '../utils/AppError';
import storeRepository from '../repositories/store.repository';
import { haversineKm } from '../helpers/geo.helper';



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
