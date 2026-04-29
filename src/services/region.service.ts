import { regionRepository } from '../repositories/region.repository';

export const regionService = {
  getProvinces() {
    return regionRepository.findAllProvinces();
  },

  getCities(provinceId: string) {
    return regionRepository.findCitiesByProvince(provinceId);
  },

  getDistricts(cityId: string) {
    return regionRepository.findDistrictsByCity(cityId);
  }
};
