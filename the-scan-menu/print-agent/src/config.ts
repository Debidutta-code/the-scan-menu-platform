import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

export interface AgentConfig {
  apiKey: string;
  port: number;
  host: string;
  allowedOrigins: string[];
  trustedPrinterIps?: string[];
}

const CONFIG_DIR = process.env.APPDATA
  ? path.join(process.env.APPDATA, 'ScanMenuPrintAgent')
  : path.join(process.env.HOME || '.', '.scanmenu-agent');

const CONFIG_FILE = path.join(CONFIG_DIR, 'config.json');

/**
 * Returns or generates persistent agent configuration
 */
export function loadAgentConfig(): AgentConfig {
  try {
    if (!fs.existsSync(CONFIG_DIR)) {
      fs.mkdirSync(CONFIG_DIR, { recursive: true });
    }

    if (fs.existsSync(CONFIG_FILE)) {
      const raw = fs.readFileSync(CONFIG_FILE, 'utf-8');
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed.apiKey === 'string') {
        return {
          port: parsed.port || 18181,
          host: parsed.host || '127.0.0.1',
          apiKey: parsed.apiKey,
          allowedOrigins: parsed.allowedOrigins || [
            'https://thescanmenu.com',
            'https://*.thescanmenu.com',
            'http://localhost:5173',
            'http://localhost:3000',
            'http://127.0.0.1:5173',
          ],
          trustedPrinterIps: parsed.trustedPrinterIps,
        };
      }
    }
  } catch (err) {
    console.warn('[Config] Failed to read config file, generating default in-memory config:', err);
  }

  // Generate new default config with secure pairing key
  const newKey = `sk_agent_${crypto.randomBytes(16).toString('hex')}`;
  const defaultConfig: AgentConfig = {
    port: 18181,
    host: '127.0.0.1',
    apiKey: newKey,
    allowedOrigins: [
      'https://thescanmenu.com',
      'https://*.thescanmenu.com',
      'http://localhost:5173',
      'http://localhost:3000',
      'http://127.0.0.1:5173',
    ],
  };

  try {
    if (!fs.existsSync(CONFIG_DIR)) {
      fs.mkdirSync(CONFIG_DIR, { recursive: true });
    }
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(defaultConfig, null, 2), 'utf-8');
    console.log(`[Config] Generated new pairing key in ${CONFIG_FILE}`);
  } catch (err) {
    console.warn('[Config] Could not write config to disk:', err);
  }

  return defaultConfig;
}

/**
 * Validates request origin against allowed list
 */
export function isOriginAllowed(origin: string | undefined, allowedOrigins: string[]): boolean {
  if (!origin) return true; // Direct non-browser requests (e.g. curl / local scripts)
  
  const cleanOrigin = origin.toLowerCase().trim();

  // Allow localhost origins for dev and local testing
  if (
    cleanOrigin.startsWith('http://localhost') ||
    cleanOrigin.startsWith('http://127.0.0.1') ||
    cleanOrigin.startsWith('https://localhost') ||
    cleanOrigin.startsWith('https://127.0.0.1')
  ) {
    return true;
  }

  return allowedOrigins.some((pattern) => {
    const cleanPattern = pattern.toLowerCase().trim();
    if (cleanPattern.startsWith('https://*.')) {
      const rootDomain = cleanPattern.replace('https://*.', '');
      return cleanOrigin.endsWith(rootDomain) && cleanOrigin.startsWith('https://');
    }
    if (cleanPattern.startsWith('http://*.')) {
      const rootDomain = cleanPattern.replace('http://*.', '');
      return cleanOrigin.endsWith(rootDomain) && cleanOrigin.startsWith('http://');
    }
    return cleanOrigin === cleanPattern;
  });
}
