import { Request, Response } from 'express';
import { authService } from '../services/auth.service';
import { catchAsync } from '../utils/catch-async';
import { FRONTEND_URL } from '../config/main.config';

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
};

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
    const { user, token } = await authService.login(req.body);

    res.cookie('access_token', token, COOKIE_OPTIONS);

    res.status(200).json({
      success: true,
      message: 'Login successful',
      data: { user }
    });
  }),

  googleCallback: catchAsync(async (req: Request, res: Response) => {
    const { token, user } = await authService.googleCallback(
      req.googleProfile!
    );

    res.cookie('access_token', token, COOKIE_OPTIONS);

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

  logout: catchAsync(async (_req: Request, res: Response) => {
    res.clearCookie('access_token', COOKIE_OPTIONS);

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
