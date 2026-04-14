import { Request, Response } from 'express';
import { userService } from '../services/user.service';
import { catchAsync } from '../utils/catch-async';
import { user_role } from '../../generated/prisma/client';

export class UserController {
    getUsers = catchAsync(async (req: Request, res: Response) => {
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
    });

    getUserById = catchAsync(async (req: Request, res: Response) => {
        const id = parseInt(req.params.id as string);
        const user = await userService.getUserById(id);

        res.status(200).json({
            success: true,
            message: 'User retrieved successfully',
            data: user
        });
    });

    createUser = catchAsync(async (req: Request, res: Response) => {
        const user = await userService.createUser(req.body);

        res.status(201).json({
            success: true,
            message: 'User created successfully',
            data: user
        });
    });

    updateUser = catchAsync(async (req: Request, res: Response) => {
        const id = parseInt(req.params.id as string);
        const user = await userService.updateUser(id, req.body);

        res.status(200).json({
            success: true,
            message: 'User updated successfully',
            data: user
        });
    });

    changeRole = catchAsync(async (req: Request, res: Response) => {
        const id = parseInt(req.params.id as string);
        const { role } = req.body;
        const user = await userService.changeRole(id, role);

        res.status(200).json({
            success: true,
            message: 'User role changed successfully',
            data: user
        });
    });

    deleteUser = catchAsync(async (req: Request, res: Response) => {
        const id = parseInt(req.params.id as string);
        await userService.deleteUser(id);

        res.status(200).json({
            success: true,
            message: 'User deleted successfully',
            data: null
        });
    });
}

export const userController = new UserController();
