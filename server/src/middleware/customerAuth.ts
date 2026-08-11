import { Request, Response, NextFunction } from 'express';
import { TokenService, TokenCustomerPayload } from '../services/token.service';
import { Customer, ICustomer } from '../models/Customer';
import { sendError } from '../utils/response';

const tokenService = new TokenService();

export interface CustomerAuthenticatedRequest extends Request {
  customer?: ICustomer;
  customerPayload?: TokenCustomerPayload;
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
          req.customer = customer;
          req.customerPayload = payload;
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
