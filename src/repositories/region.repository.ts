import { prisma } from '../config/prisma-client.config';

export const regionRepository = {
  findAllProvinces() {
    return prisma.province.findMany({
      where: { deleted_at: null },
      orderBy: { name: 'asc' },
      select: { id: true, rajaongkir_province_id: true, name: true }
    });
  },

  findCitiesByProvince(provinceId: string) {
    return prisma.city.findMany({
      where: { province_id: provinceId, deleted_at: null },
      orderBy: { name: 'asc' },
      select: { id: true, rajaongkir_city_id: true, name: true, type: true, postal_code: true }
    });
  },

  findDistrictsByCity(cityId: string) {
    return prisma.district.findMany({
      where: { city_id: cityId, deleted_at: null },
      orderBy: { name: 'asc' },
      select: { id: true, rajaongkir_district_id: true, name: true }
    });
  }
};
