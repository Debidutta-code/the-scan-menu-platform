import dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

const nodeEnv = process.env.NODE_ENV || 'development';
const isProduction = nodeEnv === 'production';
const isTest = nodeEnv === 'test';
const isDevelopment = nodeEnv === 'development';

// Under test environment, provide fallback test secrets if not set
if (isTest) {
  process.env.JWT_ACCESS_SECRET = process.env.JWT_ACCESS_SECRET || 'test_access_secret_key_123_abc_456_def';
  process.env.JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'test_refresh_secret_key_123_abc_456_def';
  process.env.JWT_CUSTOMER_SECRET = process.env.JWT_CUSTOMER_SECRET || 'test_customer_secret_key_123_abc_456_def';
  process.env.MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/pixora-qr-test';
  process.env.CLOUDINARY_CLOUD_NAME = process.env.CLOUDINARY_CLOUD_NAME || 'mock_cloud_name';
  process.env.CLOUDINARY_API_KEY = process.env.CLOUDINARY_API_KEY || '123456789012345';
  process.env.CLOUDINARY_API_SECRET = process.env.CLOUDINARY_API_SECRET || 'mock_api_secret_abc123';
  process.env.ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || '12345678901234567890123456789012';
}

export interface AppConfig {
  port: number;
  nodeEnv: string;
  isProduction: boolean;
  isTest: boolean;
  isDevelopment: boolean;
  baseDomain: string;
  clientUrl: string;
  socketCorsOrigin: string;
}

export interface DbConfig {
  mongoUri: string;
  redisUrl?: string;
}

export interface AuthConfig {
  jwtAccessSecret: string;
  jwtRefreshSecret: string;
  jwtCustomerSecret: string;
  jwtAccessExpiresIn: string;
  jwtRefreshExpiresInDays: number;
  encryptionKey: string;
}

export interface CloudinaryConfig {
  cloudName: string;
  apiKey: string;
  apiSecret: string;
}

export interface PetpoojaIntegrationConfig {
  apiUrl: string;
  appKey?: string;
  appSecret?: string;
}

export interface RazorpayIntegrationConfig {
  keyId?: string;
  keySecret?: string;
  webhookSecret?: string;
}

export interface StripeIntegrationConfig {
  secretKey?: string;
  webhookSecret?: string;
}

export interface IntegrationsConfig {
  petpooja: PetpoojaIntegrationConfig;
  razorpay: RazorpayIntegrationConfig;
  stripe: StripeIntegrationConfig;
}

export interface FirebaseConfig {
  serviceAccountKey?: string;
  projectId?: string;
}

export interface EmailConfig {
  enabled: boolean;
  from?: string;
  resendApiKey?: string;
}

export interface LoggingConfig {
  level: string;
}

export interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
  authMaxRequests: number;
  orderPlacementMax: number;
}

export interface ServerConfig {
  app: AppConfig;
  db: DbConfig;
  auth: AuthConfig;
  cloudinary: CloudinaryConfig;
  integrations: IntegrationsConfig;
  firebase: FirebaseConfig;
  email: EmailConfig;
  logging: LoggingConfig;
  rateLimit: RateLimitConfig;
}

export const config: ServerConfig = {
  app: {
    port: parseInt(process.env.PORT || '5000', 10),
    nodeEnv,
    isProduction,
    isTest,
    isDevelopment,
    baseDomain: (process.env.BASE_DOMAIN || 'app.thescanmenu.com').toLowerCase(),
    clientUrl: process.env.CLIENT_URL || 'http://localhost:5173',
    socketCorsOrigin: process.env.SOCKET_CORS_ORIGIN || process.env.CLIENT_URL || 'http://localhost:5173',
  },
  db: {
    mongoUri: process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/pixora-qr',
    redisUrl: process.env.REDIS_URL,
  },
  auth: {
    jwtAccessSecret: process.env.JWT_ACCESS_SECRET || (isTest ? 'test_access_secret_key_123_abc_456_def' : ''),
    jwtRefreshSecret: process.env.JWT_REFRESH_SECRET || (isTest ? 'test_refresh_secret_key_123_abc_456_def' : ''),
    jwtCustomerSecret: process.env.JWT_CUSTOMER_SECRET || (isTest ? 'test_customer_secret_key_123_abc_456_def' : ''),
    jwtAccessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN || '15m',
    jwtRefreshExpiresInDays: parseInt(process.env.JWT_REFRESH_EXPIRES_IN_DAYS || '1', 10), // Default 1 day for web
    encryptionKey:
      process.env.ENCRYPTION_KEY ||
      (isTest || isDevelopment ? '12345678901234567890123456789012' : ''),
  },
  cloudinary: {
    cloudName: process.env.CLOUDINARY_CLOUD_NAME || (isTest ? 'mock_cloud_name' : ''),
    apiKey: process.env.CLOUDINARY_API_KEY || (isTest ? '123456789012345' : ''),
    apiSecret: process.env.CLOUDINARY_API_SECRET || (isTest ? 'mock_api_secret_abc123' : ''),
  },
  integrations: {
    petpooja: {
      apiUrl: process.env.PETPOOJA_API_URL || 'https://api.petpooja.com/v1',
      appKey: process.env.PETPOOJA_APP_KEY,
      appSecret: process.env.PETPOOJA_APP_SECRET,
    },
    razorpay: {
      keyId: process.env.RAZORPAY_KEY_ID,
      keySecret: process.env.RAZORPAY_KEY_SECRET,
      webhookSecret: process.env.RAZORPAY_WEBHOOK_SECRET,
    },
    stripe: {
      secretKey: process.env.STRIPE_SECRET_KEY,
      webhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
    },
  },
  firebase: {
    serviceAccountKey: process.env.FIREBASE_SERVICE_ACCOUNT_KEY,
    projectId: process.env.FIREBASE_PROJECT_ID,
  },
  email: {
    enabled: process.env.EMAIL_ENABLED === 'true',
    from: process.env.EMAIL_FROM,
    resendApiKey: process.env.RESEND_API_KEY,
  },
  logging: {
    level: process.env.PINO_LOG_LEVEL || 'info',
  },
  rateLimit: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: (isTest || isDevelopment) ? 100000 : 3000,
    authMaxRequests: (isTest || isDevelopment) ? 100000 : 30,
    orderPlacementMax: (isTest || isDevelopment) ? 100000 : 100,
  },
};

/**
 * Validates critical environment configurations at server boot time.
 */
export function validateStartupConfig(): void {
  if (config.app.isTest) return;

  const requiredVariables: Array<{ key: string; value: string | undefined }> = [
    { key: 'JWT_ACCESS_SECRET', value: config.auth.jwtAccessSecret },
    { key: 'JWT_REFRESH_SECRET', value: config.auth.jwtRefreshSecret },
    { key: 'JWT_CUSTOMER_SECRET', value: config.auth.jwtCustomerSecret },
    { key: 'MONGODB_URI', value: config.db.mongoUri },
    { key: 'CLOUDINARY_CLOUD_NAME', value: config.cloudinary.cloudName },
    { key: 'CLOUDINARY_API_KEY', value: config.cloudinary.apiKey },
    { key: 'CLOUDINARY_API_SECRET', value: config.cloudinary.apiSecret },
  ];

  const missing = requiredVariables.filter((v) => !v.value).map((v) => v.key);

  if (missing.length > 0) {
    const errMsg = `FATAL ERROR: Missing required environment variables: [${missing.join(', ')}]`;
    console.error(errMsg);
    process.exit(1);
  }

  if (config.email.enabled && !config.email.from) {
    console.error('FATAL ERROR: EMAIL_ENABLED=true but EMAIL_FROM environment variable is unset.');
    process.exit(1);
  }
}

export default config;
