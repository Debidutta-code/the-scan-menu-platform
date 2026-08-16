import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import config from '../config';

const ACCESS_TOKEN_EXPIRY = config.auth.jwtAccessExpiresIn; // Short-lived

export interface TokenUserPayload {
  id: string;
  email: string;
  role: string;
  name?: string;
}

export interface TokenCustomerPayload {
  id: string;
  phone: string;
  restaurantId: string;
  name?: string;
  role: 'CUSTOMER';
}

export class TokenService {
  private accessSecret: string;
  private refreshSecret: string;
  private customerSecret: string;

  constructor() {
    const accessSecret = config.auth.jwtAccessSecret;
    const refreshSecret = config.auth.jwtRefreshSecret;
    const customerSecret = config.auth.jwtCustomerSecret;

    if (!accessSecret || !refreshSecret || !customerSecret) {
      throw new Error('FATAL ERROR: JWT_ACCESS_SECRET, JWT_REFRESH_SECRET, and JWT_CUSTOMER_SECRET must be defined in env.');
    }

    this.accessSecret = accessSecret;
    this.refreshSecret = refreshSecret;
    this.customerSecret = customerSecret;
  }

  generateAccessToken(payload: TokenUserPayload): string {
    return jwt.sign(payload, this.accessSecret, {
      expiresIn: ACCESS_TOKEN_EXPIRY as jwt.SignOptions['expiresIn'],
    });
  }

  verifyAccessToken(token: string): TokenUserPayload {
    return jwt.verify(token, this.accessSecret) as TokenUserPayload;
  }

  generateCustomerToken(payload: TokenCustomerPayload): string {
    return jwt.sign(payload, this.customerSecret, {
      expiresIn: '30d',
    });
  }

  verifyCustomerToken(token: string): TokenCustomerPayload {
    return jwt.verify(token, this.customerSecret) as TokenCustomerPayload;
  }

  generateRefreshTokenString(): string {
    return crypto.randomBytes(40).toString('hex');
  }

  hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  getRefreshTokenExpiry(clientType: string = 'web'): Date {
    const isMobile = clientType.toLowerCase() === 'mobile' || clientType.toLowerCase() === 'captain_app';
    const days = isMobile ? 365 : 1; // 1 day for web daily login, 365 days for mobile
    const expiry = new Date();
    expiry.setDate(expiry.getDate() + days);
    return expiry;
  }

  getRefreshTokenExpiryDays(clientType: string = 'web'): number {
    const isMobile = clientType.toLowerCase() === 'mobile' || clientType.toLowerCase() === 'captain_app';
    return isMobile ? 365 : 1; // 1 day for web daily login, 365 days for mobile
  }
}

export const tokenService = new TokenService();
export default TokenService;
