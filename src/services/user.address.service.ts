import { userAddressRepository } from '../repositories/user.address.repository';
import { AppError } from '../utils/AppError';
import { CreateAddressInput, UpdateAddressInput } from '../types/user.address';
import logger from '../config/logger.config';

async function findAddressOrFail(addressId: string, userId: string) {
  const address = await userAddressRepository.findByIdAndUserId(addressId, userId);
  if (!address) throw new AppError('Address not found', 404);
  return address;
}

export const userAddressService = {
  getAddresses(userId: string) {
    return userAddressRepository.findAllByUserId(userId);
  },

  async createAddress(userId: string, data: CreateAddressInput) {
    const count = await userAddressRepository.countByUserId(userId);
    const isFirst = count === 0;
    const isPrimary = isFirst || data.is_primary === true;

    if (!isFirst && isPrimary) {
      await userAddressRepository.unsetAllPrimary(userId);
    }

    const address = await userAddressRepository.create({
      user_id: userId,
      label: data.label,
      recipient_name: data.recipient_name,
      phone: data.phone,
      address: data.address,
      district_id: data.district_id,
      city_id: data.city_id,
      province_id: data.province_id,
      postal_code: data.postal_code,
      latitude: data.latitude,
      longitude: data.longitude,
      is_primary: isPrimary
    });

    logger.info(`Address created for user ${userId} (id=${address.id}, primary=${isPrimary})`);
    return address;
  },

  async updateAddress(userId: string, addressId: string, data: UpdateAddressInput) {
    await findAddressOrFail(addressId, userId);

    if (data.is_primary === true) {
      await userAddressRepository.unsetAllPrimary(userId);
    }

    const updatePayload: Record<string, unknown> = {};
    if (data.label !== undefined) updatePayload.label = data.label;
    if (data.recipient_name !== undefined) updatePayload.recipient_name = data.recipient_name;
    if (data.phone !== undefined) updatePayload.phone = data.phone;
    if (data.address !== undefined) updatePayload.address = data.address;
    if (data.district_id !== undefined) updatePayload.district_id = data.district_id;
    if (data.city_id !== undefined) updatePayload.city_id = data.city_id;
    if (data.province_id !== undefined) updatePayload.province_id = data.province_id;
    if (data.postal_code !== undefined) updatePayload.postal_code = data.postal_code;
    if (data.latitude !== undefined) updatePayload.latitude = data.latitude;
    if (data.longitude !== undefined) updatePayload.longitude = data.longitude;
    if (data.is_primary !== undefined) updatePayload.is_primary = data.is_primary;

    return userAddressRepository.update(addressId, updatePayload);
  },

  async deleteAddress(userId: string, addressId: string) {
    const existing = await findAddressOrFail(addressId, userId);

    await userAddressRepository.softDelete(addressId);

    if (existing.is_primary) {
      await userAddressRepository.setFirstAddressAsPrimary(userId);
    }

    logger.info(`Address ${addressId} deleted for user ${userId}`);
  },

  async setPrimaryAddress(userId: string, addressId: string) {
    const existing = await findAddressOrFail(addressId, userId);

    if (existing.is_primary) {
      throw new AppError('Address is already set as primary', 400);
    }

    await userAddressRepository.unsetAllPrimary(userId);
    return userAddressRepository.update(addressId, { is_primary: true });
  }
};
