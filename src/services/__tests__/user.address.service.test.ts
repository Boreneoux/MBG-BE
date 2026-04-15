import { userAddressService } from '../user.address.service';
import { userAddressRepository } from '../../repositories/user.address.repository';
import { AppError } from '../../utils/AppError';
import { Prisma } from '../../../generated/prisma/client';

// Mocks

jest.mock('../../repositories/user.address.repository');
jest.mock('../../config/logger.config', () => ({
  __esModule: true,
  default: { info: jest.fn(), error: jest.fn(), warn: jest.fn() }
}));

const mockRepo = jest.mocked(userAddressRepository);

// Fixtures

const mockAddress = {
  id: 1,
  user_id: 10,
  label: 'Home',
  recipient_name: 'John Doe',
  phone: '08123456789',
  address: 'Jl. Kebon Jeruk No. 1',
  district_id: 1,
  city_id: 1,
  province_id: 1,
  postal_code: '11530',
  latitude: new Prisma.Decimal(106.7896),
  longitude: new Prisma.Decimal(-6.2088),
  geocode_provider: null,
  geocoded_at: null,
  geocoding_status: null,
  is_primary: true,
  created_at: new Date(),
  updated_at: new Date(),
  deleted_at: null
};

const mockAddressSecondary = {
  ...mockAddress,
  id: 2,
  label: 'Office',
  is_primary: false
};

const createAddressInput = {
  label: 'Home',
  recipient_name: 'John Doe',
  phone: '08123456789',
  address: 'Jl. Kebon Jeruk No. 1',
  district_id: 1,
  city_id: 1,
  province_id: 1,
  postal_code: '11530',
  latitude: 106.7896 as unknown as number,
  longitude: -6.2088 as unknown as number
};

beforeEach(() => jest.clearAllMocks());

// ─── userAddressService.getAddresses ─────────────────────────────────────────

describe('userAddressService.getAddresses', () => {
  it('returns all non-deleted addresses for the user', async () => {
    mockRepo.findAllByUserId.mockResolvedValue([
      mockAddress,
      mockAddressSecondary
    ]);

    const result = await userAddressService.getAddresses(10);

    expect(result).toEqual([mockAddress, mockAddressSecondary]);
    expect(mockRepo.findAllByUserId).toHaveBeenCalledWith(10);
  });

  it('returns an empty array when user has no addresses', async () => {
    mockRepo.findAllByUserId.mockResolvedValue([]);

    const result = await userAddressService.getAddresses(10);

    expect(result).toEqual([]);
    expect(mockRepo.findAllByUserId).toHaveBeenCalledWith(10);
  });
});

// ─── userAddressService.createAddress ────────────────────────────────────────

describe('userAddressService.createAddress — first address', () => {
  it('auto-sets is_primary to true when user has no existing addresses', async () => {
    mockRepo.countByUserId.mockResolvedValue(0);
    mockRepo.create.mockResolvedValue({ ...mockAddress, is_primary: true });

    await userAddressService.createAddress(10, createAddressInput);

    expect(mockRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({ user_id: 10, is_primary: true })
    );
  });

  it('does not call unsetAllPrimary when creating the first address', async () => {
    mockRepo.countByUserId.mockResolvedValue(0);
    mockRepo.create.mockResolvedValue(mockAddress);

    await userAddressService.createAddress(10, createAddressInput);

    expect(mockRepo.unsetAllPrimary).not.toHaveBeenCalled();
  });
});

describe('userAddressService.createAddress — subsequent address', () => {
  it('sets is_primary to false by default when user already has addresses', async () => {
    mockRepo.countByUserId.mockResolvedValue(1);
    mockRepo.create.mockResolvedValue({ ...mockAddressSecondary });

    await userAddressService.createAddress(10, createAddressInput);

    expect(mockRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({ user_id: 10, is_primary: false })
    );
  });

  it('unsets existing primaries and sets new address as primary when is_primary is true', async () => {
    mockRepo.countByUserId.mockResolvedValue(1);
    mockRepo.unsetAllPrimary.mockResolvedValue(undefined);
    mockRepo.create.mockResolvedValue({
      ...mockAddressSecondary,
      is_primary: true
    });

    await userAddressService.createAddress(10, {
      ...createAddressInput,
      is_primary: true
    });

    expect(mockRepo.unsetAllPrimary).toHaveBeenCalledWith(10);
    expect(mockRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({ user_id: 10, is_primary: true })
    );
  });

  it('does not call unsetAllPrimary when is_primary is false or not provided', async () => {
    mockRepo.countByUserId.mockResolvedValue(2);
    mockRepo.create.mockResolvedValue(mockAddressSecondary);

    await userAddressService.createAddress(10, createAddressInput);

    expect(mockRepo.unsetAllPrimary).not.toHaveBeenCalled();
  });
});

// ─── userAddressService.updateAddress ────────────────────────────────────────

describe('userAddressService.updateAddress', () => {
  it('throws 404 when address does not exist', async () => {
    mockRepo.findByIdAndUserId.mockResolvedValue(null);

    await expect(
      userAddressService.updateAddress(10, 99, { label: 'Work' })
    ).rejects.toThrow(new AppError('Address not found', 404));
  });

  it('throws 404 when address exists but belongs to a different user', async () => {
    mockRepo.findByIdAndUserId.mockResolvedValue(null);

    await expect(
      userAddressService.updateAddress(99, 1, { label: 'Work' })
    ).rejects.toThrow(new AppError('Address not found', 404));
  });

  it('updates address fields successfully', async () => {
    mockRepo.findByIdAndUserId.mockResolvedValue(mockAddressSecondary);
    mockRepo.update.mockResolvedValue({
      ...mockAddressSecondary,
      label: 'Work'
    });

    await userAddressService.updateAddress(10, 2, { label: 'Work' });

    expect(mockRepo.update).toHaveBeenCalledWith(
      2,
      expect.objectContaining({ label: 'Work' })
    );
  });

  it('omits undefined fields from the update payload (partial update)', async () => {
    mockRepo.findByIdAndUserId.mockResolvedValue(mockAddressSecondary);
    mockRepo.update.mockResolvedValue(mockAddressSecondary);

    await userAddressService.updateAddress(10, 2, { label: 'Work' });

    const updatePayload = mockRepo.update.mock.calls[0][1];
    expect(updatePayload).not.toHaveProperty('phone');
    expect(updatePayload).not.toHaveProperty('address');
  });

  it('unsets existing primaries before updating when is_primary is true', async () => {
    mockRepo.findByIdAndUserId.mockResolvedValue(mockAddressSecondary);
    mockRepo.unsetAllPrimary.mockResolvedValue(undefined);
    mockRepo.update.mockResolvedValue({
      ...mockAddressSecondary,
      is_primary: true
    });

    await userAddressService.updateAddress(10, 2, { is_primary: true });

    expect(mockRepo.unsetAllPrimary).toHaveBeenCalledWith(10);
    expect(mockRepo.update).toHaveBeenCalledWith(
      2,
      expect.objectContaining({ is_primary: true })
    );
  });

  it('does not call unsetAllPrimary when is_primary is not being changed to true', async () => {
    mockRepo.findByIdAndUserId.mockResolvedValue(mockAddressSecondary);
    mockRepo.update.mockResolvedValue({
      ...mockAddressSecondary,
      label: 'Work'
    });

    await userAddressService.updateAddress(10, 2, { label: 'Work' });

    expect(mockRepo.unsetAllPrimary).not.toHaveBeenCalled();
  });
});

// ─── userAddressService.deleteAddress ────────────────────────────────────────

describe('userAddressService.deleteAddress', () => {
  it('throws 404 when address does not exist or belongs to another user', async () => {
    mockRepo.findByIdAndUserId.mockResolvedValue(null);

    await expect(userAddressService.deleteAddress(10, 99)).rejects.toThrow(
      new AppError('Address not found', 404)
    );
  });

  it('soft-deletes a non-primary address without side effects', async () => {
    mockRepo.findByIdAndUserId.mockResolvedValue(mockAddressSecondary);
    mockRepo.softDelete.mockResolvedValue(mockAddressSecondary);

    await userAddressService.deleteAddress(10, 2);

    expect(mockRepo.softDelete).toHaveBeenCalledWith(2);
    expect(mockRepo.setFirstAddressAsPrimary).not.toHaveBeenCalled();
  });

  it('reassigns primary to another address after deleting the primary one', async () => {
    mockRepo.findByIdAndUserId.mockResolvedValue(mockAddress); // is_primary: true
    mockRepo.softDelete.mockResolvedValue(mockAddress);
    mockRepo.setFirstAddressAsPrimary.mockResolvedValue(undefined);

    await userAddressService.deleteAddress(10, 1);

    expect(mockRepo.softDelete).toHaveBeenCalledWith(1);
    expect(mockRepo.setFirstAddressAsPrimary).toHaveBeenCalledWith(10);
  });

  it('does not call setFirstAddressAsPrimary when deleting a non-primary address', async () => {
    mockRepo.findByIdAndUserId.mockResolvedValue(mockAddressSecondary); // is_primary: false
    mockRepo.softDelete.mockResolvedValue(mockAddressSecondary);

    await userAddressService.deleteAddress(10, 2);

    expect(mockRepo.setFirstAddressAsPrimary).not.toHaveBeenCalled();
  });
});

// ─── userAddressService.setPrimaryAddress ────────────────────────────────────

describe('userAddressService.setPrimaryAddress', () => {
  it('throws 404 when address does not exist or belongs to another user', async () => {
    mockRepo.findByIdAndUserId.mockResolvedValue(null);

    await expect(userAddressService.setPrimaryAddress(10, 99)).rejects.toThrow(
      new AppError('Address not found', 404)
    );
  });

  it('throws 400 when the address is already primary', async () => {
    mockRepo.findByIdAndUserId.mockResolvedValue(mockAddress); // is_primary: true

    await expect(userAddressService.setPrimaryAddress(10, 1)).rejects.toThrow(
      new AppError('Address is already set as primary', 400)
    );
  });

  it('unsets all existing primaries then marks the target address as primary', async () => {
    mockRepo.findByIdAndUserId.mockResolvedValue(mockAddressSecondary); // is_primary: false
    mockRepo.unsetAllPrimary.mockResolvedValue(undefined);
    mockRepo.update.mockResolvedValue({
      ...mockAddressSecondary,
      is_primary: true
    });

    await userAddressService.setPrimaryAddress(10, 2);

    expect(mockRepo.unsetAllPrimary).toHaveBeenCalledWith(10);
    expect(mockRepo.update).toHaveBeenCalledWith(2, { is_primary: true });
  });

  it('calls unsetAllPrimary before update to avoid having two primaries', async () => {
    mockRepo.findByIdAndUserId.mockResolvedValue(mockAddressSecondary);
    mockRepo.unsetAllPrimary.mockResolvedValue(undefined);
    mockRepo.update.mockResolvedValue({
      ...mockAddressSecondary,
      is_primary: true
    });

    await userAddressService.setPrimaryAddress(10, 2);

    const unsetOrder = mockRepo.unsetAllPrimary.mock.invocationCallOrder[0];
    const updateOrder = mockRepo.update.mock.invocationCallOrder[0];
    expect(unsetOrder).toBeLessThan(updateOrder);
  });
});
