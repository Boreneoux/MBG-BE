import { prisma } from '../config/prisma-client.config';

export interface UpsertCacheInput {
  origin_city_id: number;
  destination_city_id: number;
  weight: number;
  courier: string;
  result: unknown;
  expires_at: Date;
}

const shippingRepository = {
  findUserAddress(addressId: number) {
    return prisma.userAddress.findFirst({
      where: { id: addressId, deleted_at: null },
      include: { city: true }
    });
  },

  findCachedCost(
    originCityId: number,
    destinationCityId: number,
    weight: number,
    courier: string
  ) {
    return prisma.shippingCostCache.findUnique({
      where: {
        origin_city_id_destination_city_id_weight_courier: {
          origin_city_id: originCityId,
          destination_city_id: destinationCityId,
          weight,
          courier
        }
      }
    });
  },

  upsertCache(data: UpsertCacheInput) {
    return prisma.shippingCostCache.upsert({
      where: {
        origin_city_id_destination_city_id_weight_courier: {
          origin_city_id: data.origin_city_id,
          destination_city_id: data.destination_city_id,
          weight: data.weight,
          courier: data.courier
        }
      },
      update: {
        result: data.result as any,
        expires_at: data.expires_at
      },
      create: {
        origin_city_id: data.origin_city_id,
        destination_city_id: data.destination_city_id,
        weight: data.weight,
        courier: data.courier,
        result: data.result as any,
        expires_at: data.expires_at
      }
    });
  }
};

export default shippingRepository;
