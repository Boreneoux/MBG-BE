import { NextFunction, Request, Response } from 'express';
import { ZodObject, ZodRawShape } from 'zod';
import { AppError } from '../utils/AppError';

export const validate =
  (schema: ZodObject<ZodRawShape>) =>
  (req: Request, _res: Response, next: NextFunction) => {
    const result = schema.safeParse({
      body: req.body,
      query: req.query,
      params: req.params,
    });

    if (!result.success) {
      const firstError = result.error.issues[0];
      const field = firstError.path.join('.');
      const message = field ? `${field}: ${firstError.message}` : firstError.message;
      return next(new AppError(message, 400));
    }

    // Replace req.body with parsed/sanitized value
    if (result.data.body !== undefined) req.body = result.data.body;

    next();
  };
