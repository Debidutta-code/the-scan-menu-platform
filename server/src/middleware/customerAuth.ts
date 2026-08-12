import { Request, Response, NextFunction } from 'express';
import { TokenService, TokenCustomerPayload } from '../services/token.service';
import { Customer, ICustomer } from '../models/Customer';
import { Restaurant, IRestaurant } from '../models/Restaurant';
import { sendError } from '../utils/response';
import config from '../config';

const tokenService = new TokenService();

export interface CustomerAuthenticatedRequest extends Request {
  customer?: ICustomer;
  customerPayload?: TokenCustomerPayload;
  restaurant?: IRestaurant | null;
  tenantId?: string;
  tenantSlug?: string;
}

export const requireCustomerAuth = async (
  req: CustomerAuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization || (req.headers['x-customer-token'] as string);
    let token = '';

    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1];
    } else if (authHeader) {
      token = authHeader;
    }

    if (!token) {
      sendError(res, 'UNAUTHORIZED', 'Customer access token is missing or malformed', null, 401);
      return;
    }

    let payload: TokenCustomerPayload;
    try {
      payload = tokenService.verifyCustomerToken(token);
    } catch (err: any) {
      if (err.name === 'TokenExpiredError') {
        sendError(res, 'TOKEN_EXPIRED', 'Customer session has expired. Please log in again.', null, 401);
        return;
      }
      sendError(res, 'UNAUTHORIZED', 'Invalid customer access token', null, 401);
      return;
    }

    if (payload.role !== 'CUSTOMER' || !payload.id) {
      sendError(res, 'UNAUTHORIZED', 'Invalid customer token payload', null, 401);
      return;
    }

    const customer = await Customer.findById(payload.id);
    if (!customer) {
      sendError(res, 'UNAUTHORIZED', 'Customer account not found', null, 401);
      return;
    }

    if (customer.isBlocked) {
      sendError(res, 'FORBIDDEN', 'This customer account has been blocked', null, 403);
      return;
    }

    // Tenant Isolation Check: Verify token matches target restaurant
    let targetRestaurantId =
      req.restaurant?._id?.toString() ||
      req.tenantId ||
      (req.params.restaurantId ? req.params.restaurantId.trim() : null) ||
      (req.query.restaurantId ? (req.query.restaurantId as string).trim() : null);

    if (!targetRestaurantId) {
      const rawHost = (req.headers['x-forwarded-host'] as string) || req.headers.host || '';
      const hostname = rawHost.split(':')[0].toLowerCase().trim();
      const baseDomain = config.app.baseDomain;

      if (hostname.endsWith(baseDomain) || hostname.endsWith('localhost')) {
        const parts = hostname.split('.');
        const isLocalhost = hostname.endsWith('localhost');
        const expectedPartCount = isLocalhost ? 1 : 2;
        if (parts.length > expectedPartCount) {
          const subdomain = parts[0];
          const rest = await Restaurant.findOne({ slug: subdomain });
          if (rest) {
            targetRestaurantId = rest._id.toString();
          }
        }
      }
    }

    if (targetRestaurantId && customer.restaurantId.toString() !== targetRestaurantId) {
      sendError(
        res,
        'FORBIDDEN',
        'Customer token is not valid for this restaurant',
        null,
        403
      );
      return;
    }

    req.customer = customer;
    req.customerPayload = payload;
    next();
  } catch (error) {
    next(error);
  }
};

export const optionalCustomerAuth = async (
  req: CustomerAuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization || (req.headers['x-customer-token'] as string);
    let token = '';

    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1];
    } else if (authHeader) {
      token = authHeader;
    }

    if (!token) {
      return next();
    }

    try {
      const payload = tokenService.verifyCustomerToken(token);
      if (payload && payload.role === 'CUSTOMER' && payload.id) {
        const customer = await Customer.findById(payload.id);
        if (customer && !customer.isBlocked) {
          let targetRestaurantId =
            req.restaurant?._id?.toString() ||
            req.tenantId ||
            (req.params.restaurantId ? req.params.restaurantId.trim() : null);

          if (!targetRestaurantId) {
            const rawHost = (req.headers['x-forwarded-host'] as string) || req.headers.host || '';
            const hostname = rawHost.split(':')[0].toLowerCase().trim();
            const baseDomain = config.app.baseDomain;

            if (hostname.endsWith(baseDomain) || hostname.endsWith('localhost')) {
              const parts = hostname.split('.');
              const isLocalhost = hostname.endsWith('localhost');
              const expectedPartCount = isLocalhost ? 1 : 2;
              if (parts.length > expectedPartCount) {
                const subdomain = parts[0];
                const rest = await Restaurant.findOne({ slug: subdomain });
                if (rest) {
                  targetRestaurantId = rest._id.toString();
                }
              }
            }
          }

          // Only attach if matching tenant or tenant not resolved yet
          if (!targetRestaurantId || customer.restaurantId.toString() === targetRestaurantId) {
            req.customer = customer;
            req.customerPayload = payload;
          }
        }
      }
    } catch {
      // Ignore token verification errors for optional auth
    }

    next();
  } catch (error) {
    next(error);
  }
};
