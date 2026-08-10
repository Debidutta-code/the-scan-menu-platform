import { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import { Restaurant, IRestaurant } from '../models/Restaurant';
import { ITable } from '../models/Table';
import { sendError } from '../utils/response';
import config from '../config';

export interface TenantRequest extends Request {
  restaurant?: IRestaurant | null;
  tenantId?: string;
  tenantSlug?: string;
  table?: ITable | null;
}

const RESERVED_SUBDOMAINS = new Set([
  'www',
  'api',
  'app',
  'admin',
  'mail',
  'static',
  'assets',
  'cdn',
  'thescanmenu',
]);

export const tenantResolverMiddleware = async (
  req: TenantRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const rawHost = (req.headers['x-forwarded-host'] as string) || req.headers.host || '';
    const hostname = rawHost.split(':')[0].toLowerCase().trim();

    let restaurant: IRestaurant | null = null;
    const baseDomain = config.app.baseDomain;

    // 1. Check for Wildcard Subdomain (e.g. randomcafe.thescanmenu.com or randomcafe.localhost)
    if (hostname.endsWith(baseDomain) || hostname.endsWith('localhost')) {
      const parts = hostname.split('.');
      const isLocalhost = hostname.endsWith('localhost');
      const expectedPartCount = isLocalhost ? 1 : 2;

      if (parts.length > expectedPartCount) {
        const subdomain = parts[0];
        if (!RESERVED_SUBDOMAINS.has(subdomain)) {
          restaurant = await Restaurant.findOne({ slug: subdomain });
        }
      }
    } else if (hostname && hostname !== '127.0.0.1' && hostname !== 'localhost') {
      // 2. Check for White-Label Custom Domain (e.g. menu.randomcafe.com)
      restaurant = await Restaurant.findOne({
        customDomain: hostname,
        customDomainStatus: 'ACTIVE',
      });
    }

    // 3. Fallback for Path Parameters (:restaurantSlug, :restaurantId, or :id)
    const paramKey = req.params.restaurantSlug || req.params.restaurantId || req.params.id;
    if (!restaurant && paramKey) {
      const targetParam = paramKey.trim();
      if (mongoose.Types.ObjectId.isValid(targetParam)) {
        restaurant = await Restaurant.findById(targetParam);
      }
      if (!restaurant) {
        restaurant = await Restaurant.findOne({ slug: targetParam.toLowerCase() });
      }
    }

    if (!restaurant) {
      sendError(res, 'TABLE_NOT_FOUND', 'The specified table or restaurant was not found', null, 404);
      return;
    }

    // 4. Validate Tenant Account Status (404 to prevent tenant enumeration on public endpoints)
    if (['SUSPENDED', 'ARCHIVED', 'EXPIRED'].includes(restaurant.status)) {
      sendError(res, 'TABLE_NOT_FOUND', 'The specified table or restaurant was not found', null, 404);
      return;
    }

    // 5. Attach resolved tenant context to Request object
    req.restaurant = restaurant;
    req.tenantId = restaurant._id.toString();
    req.tenantSlug = restaurant.slug;

    next();
  } catch (error) {
    next(error);
  }
};
