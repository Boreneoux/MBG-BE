import { Request, Response } from 'express';
import { authService } from '../services/auth.service';
import { catchAsync } from '../utils/catch-async';
import { AppError } from '../utils/AppError';
import {
  FRONTEND_URL,
  JWT_ACCESS_TOKEN_EXPIRY,
  JWT_REFRESH_TOKEN_EXPIRY
} from '../config/main.config';
import { parseDurationMs } from '../services/auth.helpers';

const IS_PROD = process.env.NODE_ENV === 'production';

const ACCESS_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: IS_PROD,
  sameSite: 'lax' as const,
  maxAge: parseDurationMs(JWT_ACCESS_TOKEN_EXPIRY)
};

const REFRESH_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: IS_PROD,
  sameSite: 'lax' as const,
  maxAge: parseDurationMs(JWT_REFRESH_TOKEN_EXPIRY)
};

const REFRESH_COOKIE_CLEAR_OPTIONS = {
  httpOnly: true,
  secure: IS_PROD,
  sameSite: 'lax' as const,
};

function setAuthCookies(res: Response, accessToken: string, rawRefreshToken: string) {
  res.cookie('access_token', accessToken, ACCESS_COOKIE_OPTIONS);
  res.cookie('refresh_token', rawRefreshToken, REFRESH_COOKIE_OPTIONS);
}

export const authController = {
  register: catchAsync(async (req: Request, res: Response) => {
    const result = await authService.register(req.body);

    res.status(201).json({
      success: true,
      message:
        'Registration successful. Please check your email to verify your account.',
      data: result
    });
  }),

  verifyEmail: catchAsync(async (req: Request, res: Response) => {
    const { token, password } = req.body;
    await authService.verifyEmail(token, password);

    res.status(200).json({
      success: true,
      message: 'Email verified and password set. Please log in to continue.',
      data: null
    });
  }),

  resendVerification: catchAsync(async (req: Request, res: Response) => {
    const { email } = req.body;
    const result = await authService.resendVerification(email);

    res.status(200).json({
      success: true,
      message: result.message,
      data: null
    });
  }),

  login: catchAsync(async (req: Request, res: Response) => {
    const { user, accessToken, rawRefreshToken } = await authService.login(req.body);

    setAuthCookies(res, accessToken, rawRefreshToken);

    res.status(200).json({
      success: true,
      message: 'Login successful',
      data: { user }
    });
  }),

  googleCallback: catchAsync(async (req: Request, res: Response) => {
    const { user, accessToken, rawRefreshToken } = await authService.googleCallback(
      req.googleProfile!
    );

    setAuthCookies(res, accessToken, rawRefreshToken);

    const redirectUrl = !user.phone
      ? `${FRONTEND_URL}/auth/complete-profile`
      : `${FRONTEND_URL}/auth/callback?status=success`;

    res.redirect(redirectUrl);
  }),

  completeProfile: catchAsync(async (req: Request, res: Response) => {
    const result = await authService.completeProfile(req.user!.id, req.body);

    res.status(200).json({
      success: true,
      message: 'Profile completed successfully',
      data: result
    });
  }),

  getMe: catchAsync(async (req: Request, res: Response) => {
    const user = await authService.getMe(req.user!.id);

    res.status(200).json({
      success: true,
      message: 'OK',
      data: { user }
    });
  }),

  refresh: catchAsync(async (req: Request, res: Response) => {
    const rawToken = req.cookies?.refresh_token as string | undefined;
    if (!rawToken) throw new AppError('Refresh token missing', 401);

    const { accessToken, rawRefreshToken } = await authService.refreshToken(rawToken);

    setAuthCookies(res, accessToken, rawRefreshToken);

    res.status(200).json({
      success: true,
      message: 'Token refreshed',
      data: null
    });
  }),

  logout: catchAsync(async (req: Request, res: Response) => {
    const rawToken = req.cookies?.refresh_token as string | undefined;
    if (rawToken) await authService.logout(rawToken);

    res.clearCookie('access_token', ACCESS_COOKIE_OPTIONS);
    res.clearCookie('refresh_token', REFRESH_COOKIE_CLEAR_OPTIONS);

    res.status(200).json({
      success: true,
      message: 'Logged out successfully',
      data: null
    });
  }),

  forgotPassword: catchAsync(async (req: Request, res: Response) => {
    const { email } = req.body;
    const result = await authService.forgotPassword(email);

    res.status(200).json({
      success: true,
      message: result.message,
      data: null
    });
  }),

  resetPassword: catchAsync(async (req: Request, res: Response) => {
    const { token, new_password } = req.body;
    const result = await authService.resetPassword(token, new_password);

    res.status(200).json({
      success: true,
      message: result.message,
      data: null
    });
  }),

  setupPassword: catchAsync(async (req: Request, res: Response) => {
    const { password } = req.body;
    const result = await authService.setupPassword(req.user!.id, password);

    res.status(200).json({
      success: true,
      message: result.message,
      data: null
    });
  })
};
