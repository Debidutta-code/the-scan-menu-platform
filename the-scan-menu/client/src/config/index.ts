/**
 * Centralized Client Configuration Module
 * 
 * All frontend environment variables and application constants should be accessed
 * through this module rather than reading raw `import.meta.env` values directly.
 */

export interface ClientConfig {
  apiBaseUrl: string;
  socketUrl: string;
  appName: string;
  baseDomain: string;
  razorpayKeyId: string;
  isDev: boolean;
  isProd: boolean;
  mode: string;
}

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api/v1';

export const config: ClientConfig = {
  apiBaseUrl,
  socketUrl:
    import.meta.env.VITE_SOCKET_URL ||
    apiBaseUrl.replace(/\/api\/v1\/?$/, '') ||
    'http://localhost:5000',
  appName: import.meta.env.VITE_APP_NAME || 'The Scan Menu',
  baseDomain: import.meta.env.VITE_BASE_DOMAIN || 'app.thescanmenu.com',
  razorpayKeyId: import.meta.env.VITE_RAZORPAY_KEY_ID || '',
  isDev: import.meta.env.DEV ?? false,
  isProd: import.meta.env.PROD ?? true,
  mode: import.meta.env.MODE || 'development',
};

export default config;
