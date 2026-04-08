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
