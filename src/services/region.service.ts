import { regionRepository } from '../repositories/region.repository';

export const regionService = {
  getProvinces() {
    return regionRepository.findAllProvinces();
  },

  getCities(provinceId: number) {
    return regionRepository.findCitiesByProvince(provinceId);
  },

  getDistricts(cityId: number) {
    return regionRepository.findDistrictsByCity(cityId);
  }
};
