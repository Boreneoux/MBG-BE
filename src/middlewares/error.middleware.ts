import { NextFunction, Request, Response } from 'express';
import { Prisma } from '../../generated/prisma/client';
import { AppError } from '../utils/AppError';

export const errorMiddleware = (
  err: any,
  _: Request,
  res: Response,
  next: NextFunction
) => {
  // Prisma → AppError
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === 'P2002') {
      const field = (err.meta?.target as string[])?.[0];
      err = new AppError(`${field} already exists`, 409);
    } else if (err.code === 'P2025') {
      err = new AppError('Resource not found', 404);
    }
  }

  // Prisma validation errors (client input)
  if (err instanceof Prisma.PrismaClientValidationError) {
    return res.status(400).json({
      success: false,
      message: 'Invalid request data',
      data: null
    });
  }

  // AppError → client
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      success: false,
      message: err.message,
      data: null
    });
  }

  // Unknown error → 500
  console.error('UNEXPECTED ERROR:', err);

  res.status(500).json({
    success: false,
    message: 'Internal server error',
    data: null
  });
};
