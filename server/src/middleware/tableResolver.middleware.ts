import { Response, NextFunction } from 'express';
import { Table } from '../models/Table';
import { sendError } from '../utils/response';
import { TenantRequest } from './tenantResolver.middleware';

export const tableResolverMiddleware = async (
  req: TenantRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const tableToken = req.params.tableToken || (req.query.tableToken as string);

    if (!tableToken) {
      sendError(res, 'TABLE_REQUIRED', 'Table token is missing from request parameters', null, 400);
      return;
    }

    if (!req.restaurant) {
      sendError(res, 'RESTAURANT_NOT_FOUND', 'Restaurant context is required to resolve table', null, 404);
      return;
    }

    const table = await Table.findOne({
      token: tableToken,
      restaurantId: req.restaurant._id,
      isActive: true,
    });

    if (!table) {
      sendError(res, 'TABLE_NOT_FOUND', 'The specified table was not found or is inactive', null, 404);
      return;
    }

    req.table = table;
    next();
  } catch (error) {
    next(error);
  }
};
