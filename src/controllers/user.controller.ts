import { Request, Response } from 'express';
import { userService } from '../services/user.service';
import { catchAsync } from '../utils/catch-async';
import { user_role } from '../../generated/prisma/client';
import {
  cloudinaryUpload,
  cloudinaryDelete,
  buildCloudinaryFolder
} from '../helpers/cloudinary.helper';

export const userController = {
  getUsers: catchAsync(async (req: Request, res: Response) => {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const search = req.query.search as string;
    const role = req.query.role as user_role;

    const result = await userService.getUsers({ page, limit, search, role });

    res.status(200).json({
      success: true,
      message: 'Users retrieved successfully',
      data: result.data,
      meta: result.meta
    });
  }),

  getUserById: catchAsync(async (req: Request, res: Response) => {
    const user = await userService.getUserById(req.params.id as string);

    res.status(200).json({
      success: true,
      message: 'User retrieved successfully',
      data: user
    });
  }),

  createUser: catchAsync(async (req: Request, res: Response) => {
    const user = await userService.createUser(req.body);

    res.status(201).json({
      success: true,
      message: 'User created successfully',
      data: user
    });
  }),

  updateUser: catchAsync(async (req: Request, res: Response) => {
    const user = await userService.updateUser(
      req.params.id as string,
      req.body
    );

    res.status(200).json({
      success: true,
      message: 'User updated successfully',
      data: user
    });
  }),

  changeRole: catchAsync(async (req: Request, res: Response) => {
    const { role } = req.body;
    const user = await userService.changeRole(req.params.id as string, role);

    res.status(200).json({
      success: true,
      message: 'User role changed successfully',
      data: user
    });
  }),

  deleteUser: catchAsync(async (req: Request, res: Response) => {
    await userService.deleteUser(req.params.id as string);

    res.status(200).json({
      success: true,
      message: 'User deleted successfully',
      data: null
    });
  }),

  getProfile: catchAsync(async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const user = await userService.getProfile(userId);

    res.status(200).json({
      success: true,
      message: 'Profile retrieved successfully',
      data: user
    });
  }),

  updateProfile: catchAsync(async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const updateData = { ...req.body };

    if (req.file) {
      const folder = buildCloudinaryFolder('users', String(userId), 'profile');

      // Delete old photo from Cloudinary if one exists
      const currentProfile = await userService.getProfile(userId);
      if (currentProfile.profile_image_public_id) {
        await cloudinaryDelete(currentProfile.profile_image_public_id);
      }

      const { secureUrl, publicId } = await cloudinaryUpload(
        req.file.buffer,
        folder
      );
      updateData.profile_image = secureUrl;
      updateData.profile_image_public_id = publicId;
    }

    const user = await userService.updateProfile(userId, updateData);

    res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      data: user
    });
  })
};
