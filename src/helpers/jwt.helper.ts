import jwt, { SignOptions } from 'jsonwebtoken';

export function jwtCreateToken(
  payload: any,
  secretKey: string,
  options: SignOptions
) {
  return jwt.sign(payload, secretKey, options);
}

export function jwtVerifyToken(token: string, secretKey: string) {
  return jwt.verify(token, secretKey);
}
