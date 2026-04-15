import { Request, Response, NextFunction } from 'express';
import { jwtVerifyToken } from '../helpers/jwt.helper';
import { JWT_SECRET_TOKEN } from '../config/main.config';
import { AppError } from '../utils/AppError';
import { user_role } from '../../generated/prisma/client';
import { GoogleProfile } from '../types/auth';

export { GoogleProfile };

declare global {
  namespace Express {
    interface User {
      id: number;
      email: string;
      role: user_role;
    }
    interface Request {
      googleProfile?: GoogleProfile;
    }
  }
}

export type JwtPayload = Express.User;

export const authenticate = (
  req: Request,
  _res: Response,
  next: NextFunction
) => {
  try {
    const tokenFromCookie = req.cookies?.access_token as string | undefined;
    const authHeader = req.headers.authorization;
    const tokenFromHeader = authHeader?.startsWith('Bearer ')
      ? authHeader.slice(7)
      : undefined;

    const token = tokenFromCookie ?? tokenFromHeader;

    if (!token) {
      throw new AppError('Authentication required', 401);
    }

    const payload = jwtVerifyToken(token, JWT_SECRET_TOKEN!) as JwtPayload;
    req.user = payload;
    next();
  } catch (err: any) {
    if (err instanceof AppError) return next(err);
    if (err.name === 'TokenExpiredError') {
      return next(new AppError('Session expired, please log in again', 401));
    }
    return next(new AppError('Invalid token', 401));
  }
};

export const authorize =
  (...roles: user_role[]) =>
  (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) return next(new AppError('Authentication required', 401));
    if (!roles.includes(req.user.role)) {
      return next(new AppError('Forbidden: insufficient permissions', 403));
    }
    next();
  };

// Tries to parse the JWT but never rejects — req.user is set only when valid
export const optionalAuthenticate = (
  req: Request,
  _res: Response,
  next: NextFunction
) => {
  try {
    const tokenFromCookie = req.cookies?.access_token as string | undefined;
    const authHeader = req.headers.authorization;
    const tokenFromHeader = authHeader?.startsWith('Bearer ')
      ? authHeader.slice(7)
      : undefined;
    const token = tokenFromCookie ?? tokenFromHeader;
    if (token) {
      req.user = jwtVerifyToken(token, JWT_SECRET_TOKEN!) as JwtPayload;
    }
  } catch {
    // silently ignore — unauthenticated request proceeds normally
  }
  next();
};
