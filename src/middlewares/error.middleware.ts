import { NextFunction, Request, Response } from 'express';
import { Prisma } from '../../generated/prisma/client';
import { ZodError } from 'zod';
import { AppError } from '../utils/AppError';
import logger from '../config/logger.config';

function handlePrismaError(err: Prisma.PrismaClientKnownRequestError): AppError {
  switch (err.code) {
    case 'P2002': {
      const field = (err.meta?.target as string[])?.[0] ?? 'Field';
      return new AppError(`${field} already exists`, 409);
    }
    case 'P2025':
      return new AppError('Resource not found', 404);
    case 'P2003':
      return new AppError('Related resource not found', 400);
    case 'P2011':
      return new AppError('Required field is missing', 400);
    default:
      logger.warn(`Unhandled Prisma error [${err.code}]`, { meta: err.meta });
      return new AppError('Database operation failed', 500);
  }
}

export const errorMiddleware = (
  err: any,
  _req: Request,
  res: Response,
  _next: NextFunction
) => {
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    const appError = handlePrismaError(err);
    return res.status(appError.statusCode).json({ success: false, message: appError.message, data: null });
  }

  if (err instanceof Prisma.PrismaClientValidationError) {
    logger.warn('PrismaClientValidationError', { message: err.message });
    return res.status(400).json({ success: false, message: 'Invalid request data', data: null });
  }

  if (err instanceof ZodError) {
    const message = err.issues[0]?.message ?? 'Validation error';
    return res.status(400).json({ success: false, message, data: null });
  }

  if (err instanceof AppError) {
    return res.status(err.statusCode).json({ success: false, message: err.message, data: null });
  }

  logger.error('Unexpected error', { message: err?.message ?? err, stack: err?.stack });
  return res.status(500).json({ success: false, message: 'Internal server error', data: null });
};
