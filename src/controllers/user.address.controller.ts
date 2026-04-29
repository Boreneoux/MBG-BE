import { Request, Response } from 'express';
import { userAddressService } from '../services/user.address.service';
import { catchAsync } from '../utils/catch-async';

export const userAddressController = {
  getAddresses: catchAsync(async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const addresses = await userAddressService.getAddresses(userId);

    res.status(200).json({
      success: true,
      message: 'Addresses retrieved successfully',
      data: addresses
    });
  }),

  createAddress: catchAsync(async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const address = await userAddressService.createAddress(userId, req.body);

    res.status(201).json({
      success: true,
      message: 'Address created successfully',
      data: address
    });
  }),

  updateAddress: catchAsync(async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const address = await userAddressService.updateAddress(userId, req.params.id as string, req.body);

    res.status(200).json({
      success: true,
      message: 'Address updated successfully',
      data: address
    });
  }),

  deleteAddress: catchAsync(async (req: Request, res: Response) => {
    const userId = req.user!.id;
    await userAddressService.deleteAddress(userId, req.params.id as string);

    res.status(200).json({
      success: true,
      message: 'Address deleted successfully',
      data: null
    });
  }),

  setPrimaryAddress: catchAsync(async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const address = await userAddressService.setPrimaryAddress(userId, req.params.id as string);

    res.status(200).json({
      success: true,
      message: 'Primary address updated successfully',
      data: address
    });
  })
};
