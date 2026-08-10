import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import config from '../config';

const ACCESS_TOKEN_EXPIRY = config.auth.jwtAccessExpiresIn; // Short-lived
const REFRESH_TOKEN_EXPIRY_DAYS = config.auth.jwtRefreshExpiresInDays; // Long-lived

export interface TokenUserPayload {
  id: string;
  email: string;
  role: string;
  name?: string;
}

export class TokenService {
  private accessSecret: string;
  private refreshSecret: string;

  constructor() {
    const accessSecret = config.auth.jwtAccessSecret;
    const refreshSecret = config.auth.jwtRefreshSecret;

    if (!accessSecret || !refreshSecret) {
      throw new Error('FATAL ERROR: JWT_ACCESS_SECRET and JWT_REFRESH_SECRET must be defined in env.');
    }

    this.accessSecret = accessSecret;
    this.refreshSecret = refreshSecret;
  }

  generateAccessToken(payload: TokenUserPayload): string {
    return jwt.sign(payload, this.accessSecret, { expiresIn: ACCESS_TOKEN_EXPIRY });
  }

  verifyAccessToken(token: string): TokenUserPayload {
    return jwt.verify(token, this.accessSecret) as TokenUserPayload;
  }

  generateRefreshTokenString(): string {
    return crypto.randomBytes(40).toString('hex');
  }

  hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  getRefreshTokenExpiry(): Date {
    const expiry = new Date();
    expiry.setDate(expiry.getDate() + REFRESH_TOKEN_EXPIRY_DAYS);
    return expiry;
  }
}
export default TokenService;
