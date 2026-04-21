import 'dotenv/config';

export const PORT = process.env.PORT;
export const DATABASE_URL = process.env.DATABASE_URL;
export const JWT_SECRET_TOKEN = process.env.JWT_SECRET_TOKEN;
export const CLOUDINARY_CLOUD_NAME = process.env.CLOUDINARY_CLOUD_NAME;
export const CLOUDINARY_API_KEY = process.env.CLOUDINARY_API_KEY;
export const CLOUDINARY_API_SECRET = process.env.CLOUDINARY_API_SECRET;
export const USER_EMAILER = process.env.USER_EMAILER;
export const PASSWORD_EMAILER = process.env.PASSWORD_EMAILER;
export const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';
export const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
export const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
export const GOOGLE_CALLBACK_URL = process.env.GOOGLE_CALLBACK_URL;
export const SESSION_SECRET = process.env.SESSION_SECRET || 'secret';
export const RAJAONGKIR_API_KEY = process.env.RAJAONGKIR_API_KEY;
export const RAJAONGKIR_BASE_URL = process.env.RAJAONGKIR_BASE_URL;

// Midtrans Payment Gateway
export const MIDTRANS_SERVER_KEY = process.env.MIDTRANS_SERVER_KEY || '';
export const MIDTRANS_CLIENT_KEY = process.env.MIDTRANS_CLIENT_KEY || '';
export const MIDTRANS_IS_PRODUCTION = process.env.MIDTRANS_IS_PRODUCTION === 'true';
export const MIDTRANS_SNAP_URL = process.env.MIDTRANS_SNAP_URL || 'https://app.sandbox.midtrans.com/snap/v1';
export const MIDTRANS_API_URL = process.env.MIDTRANS_API_URL || 'https://api.sandbox.midtrans.com';
export const MIDTRANS_WEBHOOK_URL = process.env.MIDTRANS_WEBHOOK_URL || 'http://localhost:8000/api/orders/webhook/payment';
