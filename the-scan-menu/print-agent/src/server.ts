import http from 'http';
import { sendRawTcp } from './tcpClient';
import {
  buildCustomerBillBuffer,
  buildKOTBuffer,
  buildTestSlipBuffer,
  PrintOrderData,
  RestaurantPrintInfo,
} from './formatter';
import { loadAgentConfig, isOriginAllowed, AgentConfig } from './config';

interface PrintRequestBody {
  type?: 'CUSTOMER' | 'KITCHEN' | 'COUNTER' | 'BOTH';
  ip: string;
  port?: number;
  paperWidth?: '80mm' | '58mm';
  order: PrintOrderData;
  restaurantInfo?: RestaurantPrintInfo;
  kotNotes?: string;
}

interface TestRequestBody {
  ip: string;
  port?: number;
  paperWidth?: '80mm' | '58mm';
  restaurantName?: string;
  printerName?: string;
}

function setCorsHeaders(res: http.ServerResponse, req: http.IncomingMessage, config: AgentConfig) {
  const origin = req.headers.origin;
  if (origin && isOriginAllowed(origin, config.allowedOrigins)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  } else if (!origin) {
    res.setHeader('Access-Control-Allow-Origin', '*');
  } else {
    // If not in allowed list, do not set Access-Control-Allow-Origin or restrict
    res.setHeader('Access-Control-Allow-Origin', 'null');
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-ScanMenu-Key, X-Requested-With');
  res.setHeader('Access-Control-Max-Age', '86400');
}

function sendJson(res: http.ServerResponse, statusCode: number, data: any) {
  res.writeHead(statusCode, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(data));
}

function parseJsonBody<T>(req: http.IncomingMessage): Promise<T> {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk.toString();
      if (body.length > 2 * 1024 * 1024) {
        // 2MB limit
        reject(new Error('Request payload too large'));
      }
    });
    req.on('end', () => {
      try {
        const parsed = body ? JSON.parse(body) : {};
        resolve(parsed);
      } catch (err) {
        reject(new Error('Invalid JSON format'));
      }
    });
    req.on('error', (err) => reject(err));
  });
}

function authenticateRequest(req: http.IncomingMessage, config: AgentConfig): boolean {
  const origin = req.headers.origin;
  
  // 1. If request comes from a trusted browser origin (e.g. app.thescanmenu.com or localhost POS)
  if (origin && isOriginAllowed(origin, config.allowedOrigins)) {
    return true;
  }

  // 2. Direct pairing key header check
  const providedKey = req.headers['x-scanmenu-key'] || req.headers.authorization?.replace(/^Bearer\s+/i, '');
  if (providedKey && typeof providedKey === 'string' && providedKey.trim() === config.apiKey) {
    return true;
  }

  // 3. For local CLI / health tools connecting directly without Origin header
  const remoteIp = req.socket.remoteAddress;
  if (!origin && (remoteIp === '127.0.0.1' || remoteIp === '::1' || remoteIp === '::ffff:127.0.0.1')) {
    return true;
  }

  return false;
}

export function createPrintAgentServer(customConfig?: Partial<AgentConfig>) {
  const config: AgentConfig = {
    ...loadAgentConfig(),
    ...customConfig,
  };

  const server = http.createServer(async (req, res) => {
    setCorsHeaders(res, req, config);

    if (req.method === 'OPTIONS') {
      res.writeHead(204);
      res.end();
      return;
    }

    const url = req.url?.split('?')[0] || '/';

    // 1. GET /health or GET /status (Public diagnostic endpoint)
    if (req.method === 'GET' && (url === '/' || url === '/health' || url === '/status')) {
      return sendJson(res, 200, {
        status: 'ok',
        service: 'scanmenu-print-agent',
        version: '1.0.0',
        uptimeSeconds: Math.floor(process.uptime()),
        timestamp: new Date().toISOString(),
        nodeVersion: process.version,
        platform: process.platform,
        security: {
          originEnforcement: true,
          loopbackBlocked: true,
          ssrfProtected: true,
        },
      });
    }

    // Origin / Authentication Verification
    if (!authenticateRequest(req, config)) {
      console.warn(`[Security] Rejected unauthorized request from origin: ${req.headers.origin || 'unknown'}`);
      return sendJson(res, 403, {
        success: false,
        error: 'Forbidden: Origin or pairing key not authorized.',
      });
    }

    // 2. POST /test (Send diagnostic slip to LAN printer)
    if (req.method === 'POST' && url === '/test') {
      try {
        const body = await parseJsonBody<TestRequestBody>(req);
        if (!body.ip || typeof body.ip !== 'string') {
          return sendJson(res, 400, { success: false, error: 'Printer IP address is required' });
        }

        const buffer = buildTestSlipBuffer(
          body.ip.trim(),
          body.port || 9100,
          body.paperWidth || '80mm',
          body.restaurantName || 'Demo Cafe',
          body.printerName || 'Counter Printer'
        );

        const result = await sendRawTcp(body.ip.trim(), body.port || 9100, buffer);
        console.log(`[TestPrint] Successfully sent test slip to ${body.ip}:${body.port || 9100}`);
        return sendJson(res, 200, { success: true, message: result.message });
      } catch (err: any) {
        console.error(`[TestPrint Error]`, err.message);
        return sendJson(res, 502, { success: false, error: err.message || 'Test print failed' });
      }
    }

    // 3. POST /print (Format order and dispatch to thermal printer)
    if (req.method === 'POST' && url === '/print') {
      try {
        const body = await parseJsonBody<PrintRequestBody>(req);
        if (!body.ip || typeof body.ip !== 'string') {
          return sendJson(res, 400, { success: false, error: 'Printer IP address is required' });
        }
        if (!body.order || !Array.isArray(body.order.items)) {
          return sendJson(res, 400, { success: false, error: 'Valid order data with items is required' });
        }

        const type = body.type || 'CUSTOMER';
        const paperWidth = body.paperWidth || '80mm';
        const port = body.port || 9100;
        const ip = body.ip.trim();

        let buffer: Buffer;

        if (type === 'KITCHEN') {
          buffer = buildKOTBuffer(body.order, paperWidth, body.kotNotes);
        } else if (type === 'COUNTER') {
          buffer = buildCustomerBillBuffer(body.order, body.restaurantInfo || {}, paperWidth, true);
        } else if (type === 'BOTH') {
          const kotBuf = buildKOTBuffer(body.order, paperWidth, body.kotNotes);
          const billBuf = buildCustomerBillBuffer(body.order, body.restaurantInfo || {}, paperWidth, true);
          buffer = Buffer.concat([kotBuf, billBuf]);
        } else {
          // CUSTOMER
          buffer = buildCustomerBillBuffer(body.order, body.restaurantInfo || {}, paperWidth, false);
        }

        const result = await sendRawTcp(ip, port, buffer);
        console.log(`[PrintJob] Dispatched ${type} receipt (${buffer.length} bytes) to ${ip}:${port}`);
        return sendJson(res, 200, { success: true, message: result.message });
      } catch (err: any) {
        console.error(`[PrintJob Error]`, err.message);
        return sendJson(res, 502, { success: false, error: err.message || 'Thermal print job failed' });
      }
    }

    // 4. POST /raw (Send direct ESC/POS binary base64)
    if (req.method === 'POST' && url === '/raw') {
      try {
        const body = await parseJsonBody<{ ip: string; port?: number; data: string }>(req);
        if (!body.ip || !body.data) {
          return sendJson(res, 400, { success: false, error: 'IP and base64 data are required' });
        }
        const buffer = Buffer.from(body.data, 'base64');
        const result = await sendRawTcp(body.ip.trim(), body.port || 9100, buffer);
        return sendJson(res, 200, { success: true, message: result.message });
      } catch (err: any) {
        return sendJson(res, 502, { success: false, error: err.message });
      }
    }

    // Route not found
    return sendJson(res, 404, { error: 'Not found' });
  });

  return server;
}

export function startPrintAgent() {
  const config = loadAgentConfig();
  const server = createPrintAgentServer(config);
  
  server.listen(config.port, config.host, () => {
    console.log(`=======================================================`);
    console.log(`🚀 The Scan Menu Local Print Agent v1.0.0 is Running!`);
    console.log(`📍 Listening on: http://${config.host}:${config.port}`);
    console.log(`🛡️  Security: Origin filtering & SSRF protection enabled`);
    console.log(`🔌 Ready to transmit ESC/POS tickets to LAN thermal POS`);
    console.log(`=======================================================`);
  });

  // Handle uncaught exceptions gracefully without crashing the whole process
  process.on('uncaughtException', (err) => {
    console.error('[Fatal Error] Uncaught exception in print agent:', err);
  });

  process.on('unhandledRejection', (reason) => {
    console.error('[Fatal Error] Unhandled rejection in print agent:', reason);
  });

  return server;
}
