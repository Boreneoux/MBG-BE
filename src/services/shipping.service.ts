import axios from 'axios';
import { AppError } from '../utils/AppError';
import storeRepository from '../repositories/store.repository';
import shippingRepository from '../repositories/shipping.repository';
import logger from '../config/logger.config';
import { RAJAONGKIR_API_KEY, RAJAONGKIR_BASE_URL } from '../config/main.config';
import type { CalculateInput, CalculateResult, ShippingOption } from '../types/shipping';

const EARTH_RADIUS_KM = 6371;
const CACHE_TTL_HOURS = 24;
const BASE_URL = RAJAONGKIR_BASE_URL ?? 'https://api.rajaongkir.com/starter';

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return EARTH_RADIUS_KM * 2 * Math.asin(Math.sqrt(a));
}

// Komerce response shape: data[] is already flat — one entry per service
function flattenResults(data: any[]): ShippingOption[] {
  return data.map((item) => ({
    courier: item.code,
    service: item.service,
    description: item.description,
    cost: item.cost,
    etd: item.etd
  }));
}

export const shippingService = {
  async calculate(input: CalculateInput): Promise<CalculateResult> {
    const { store_id, address_id, user_id, weight, courier } = input;

    const store = await storeRepository.findById(store_id);
    if (!store) throw new AppError('Store not found', 404);

    const address = await shippingRepository.findUserAddress(address_id);
    if (!address) throw new AppError('Address not found', 404);

    if (address.user_id !== user_id) {
      throw new AppError('Address does not belong to this user', 403);
    }

    const rawKm = haversineKm(
      store.latitude.toNumber(),
      store.longitude.toNumber(),
      address.latitude.toNumber(),
      address.longitude.toNumber()
    );
    const distance_km = Math.round(rawKm * 100) / 100;

    if (distance_km > store.max_delivery_distance.toNumber()) {
      throw new AppError("Delivery address is outside the store's delivery range", 422);
    }

    const originCityId = store.city.rajaongkir_city_id;
    const destCityId = address.city.rajaongkir_city_id;

    const cached = await shippingRepository.findCachedCost(originCityId, destCityId, weight, courier);
    if (cached && cached.expires_at > new Date()) {
      return { distance_km, options: flattenResults(cached.result as any[]) };
    }

    let results: any[];
    try {
      const { data } = await axios.post(
        `${BASE_URL}/calculate/domestic-cost`,
        new URLSearchParams({
          origin: String(originCityId),
          destination: String(destCityId),
          weight: String(weight),
          courier
        }).toString(),
        {
          headers: {
            key: RAJAONGKIR_API_KEY!,
            'content-type': 'application/x-www-form-urlencoded'
          }
        }
      );

      if (data.meta?.code !== 200 || data.meta?.status !== 'success') {
        throw new Error(data.meta?.message ?? 'Unknown API error');
      }

      results = data.data;
    } catch (err) {
      if (err instanceof AppError) throw err;
      logger.error('RajaOngkir API error', { err });
      throw new AppError('Shipping cost service is temporarily unavailable', 502);
    }

    const expiresAt = new Date(Date.now() + CACHE_TTL_HOURS * 60 * 60 * 1000);
    await shippingRepository.upsertCache({
      origin_city_id: originCityId,
      destination_city_id: destCityId,
      weight,
      courier,
      result: results,
      expires_at: expiresAt
    });

    return { distance_km, options: flattenResults(results) };
  }
};
