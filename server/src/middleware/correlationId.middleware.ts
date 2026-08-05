import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';

export interface RequestWithCorrelationId extends Request {
  correlationId?: string;
}

export const correlationIdMiddleware = (
  req: RequestWithCorrelationId,
  res: Response,
  next: NextFunction
): void => {
  const existingCorrelationId = req.headers['x-correlation-id'] as string;
  const correlationId = existingCorrelationId || crypto.randomUUID();

  req.correlationId = correlationId;
  res.setHeader('X-Correlation-ID', correlationId);

  next();
};
