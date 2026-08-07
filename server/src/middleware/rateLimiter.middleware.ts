import rateLimit from 'express-rate-limit';

const isDevOrTest = process.env.NODE_ENV === 'test' || process.env.NODE_ENV === 'development';

/**
 * Auth rate limiter: 10 requests per 15 minutes per IP in production (protects login & auth).
 * Higher limit in dev/test to prevent developer lockout.
 */
export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isDevOrTest ? 10000 : 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: {
      code: 'TOO_MANY_REQUESTS',
      message: 'Too many authentication attempts. Please try again after 15 minutes.',
      details: null,
    },
  },
});

/**
 * Order placement rate limiter: 30 requests per minute per IP (protects public order spam).
 */
export const orderPlacementRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: isDevOrTest ? 10000 : 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: {
      code: 'TOO_MANY_REQUESTS',
      message: 'Order creation rate limit exceeded. Please wait a moment before trying again.',
      details: null,
    },
  },
});

/**
 * General API rate limiter: 300 requests per 15 minutes per IP.
 */
export const generalApiRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isDevOrTest ? 10000 : 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: {
      code: 'TOO_MANY_REQUESTS',
      message: 'API rate limit exceeded. Please slow down your requests.',
      details: null,
    },
  },
});
