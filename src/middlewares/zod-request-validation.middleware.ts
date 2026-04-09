import { NextFunction, Request, Response } from 'express';
import { z } from 'zod';
import { AppError } from '../utils/AppError';

export const validate =
  (schema: z.ZodTypeAny) =>
  (req: Request, _res: Response, next: NextFunction) => {
    const result = schema.safeParse({
      body: req.body,
      query: req.query,
      params: req.params
    });

    if (!result.success) {
      console.log(
        '[validate] issues:',
        JSON.stringify(result.error.issues, null, 2)
      );
      const firstError = result.error.issues[0];
      const field = firstError.path.join('.');
      const message = field
        ? `${field}: ${firstError.message}`
        : firstError.message;
      return next(new AppError(message, 400));
    }

    // Replace req.body with parsed/sanitized value
    const data = result.data as Record<string, unknown>;
    if (data.body !== undefined) req.body = data.body;

    next();
  };
