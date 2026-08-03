import { Request, Response, NextFunction } from 'express';
import { apiKeyService } from '../services/apiKey.service';
import { sendError } from '../utils/response';
import { ApiKeyScope, IApiKey } from '../models/ApiKey';

export interface ApiKeyRequest extends Request {
  apiKey?: IApiKey;
  restaurantId?: string;
}

export const requireApiKey = (requiredScope?: ApiKeyScope) => {
  return async (req: ApiKeyRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const authHeader = req.headers['authorization'] || req.headers['x-api-key'];

      let rawKey = '';
      if (typeof authHeader === 'string') {
        if (authHeader.startsWith('Bearer ')) {
          rawKey = authHeader.substring(7).trim();
        } else {
          rawKey = authHeader.trim();
        }
      }

      if (!rawKey) {
        sendError(res, 'UNAUTHORIZED', 'API key is required. Provide X-API-Key or Authorization header.', null, 401);
        return;
      }

      const apiKey = await apiKeyService.verifyApiKey(rawKey);

      if (!apiKey) {
        sendError(res, 'UNAUTHORIZED', 'Invalid or expired API key.', null, 401);
        return;
      }

      if (requiredScope && !apiKey.scopes.includes(requiredScope)) {
        sendError(
          res,
          'FORBIDDEN',
          `API key lacks required scope '${requiredScope}'. Granted scopes: [${apiKey.scopes.join(', ')}]`,
          null,
          403
        );
        return;
      }

      req.apiKey = apiKey;
      req.restaurantId = apiKey.restaurantId.toString();

      next();
    } catch (error: any) {
      console.error('Error in requireApiKey middleware:', error);
      sendError(res, 'INTERNAL_ERROR', 'Internal server error validating API key', null, 500);
    }
  };
};
