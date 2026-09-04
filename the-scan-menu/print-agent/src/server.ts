import http from 'http';
import { sendRawTcp } from './tcpClient';
import {
  buildCustomerBillBuffer,
  buildKOTBuffer,
  buildTestSlipBuffer,
  PrintOrderData,
  RestaurantPrintInfo,
} from './formatter';

const PORT = 18181;
const HOST = '127.0.0.1'; // Strictly localhost

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

function setCorsHeaders(res: http.ServerResponse, req: http.IncomingMessage) {
  const origin = req.headers.origin || '*';
  res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
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

export function createPrintAgentServer() {
  const server = http.createServer(async (req, res) => {
    setCorsHeaders(res, req);

    if (req.method === 'OPTIONS') {
      res.writeHead(204);
      res.end();
      return;
    }

    const url = req.url?.split('?')[0] || '/';

    // 1. GET /health or GET /status
    if (req.method === 'GET' && (url === '/' || url === '/health' || url === '/status')) {
      return sendJson(res, 200, {
        status: 'ok',
        service: 'scanmenu-print-agent',
        version: '1.0.0',
        uptimeSeconds: Math.floor(process.uptime()),
        timestamp: new Date().toISOString(),
      });
    }

    // 2. POST /test
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
        return sendJson(res, 200, { success: true, message: result.message });
      } catch (err: any) {
        return sendJson(res, 502, { success: false, error: err.message || 'Test print failed' });
      }
    }

    // 3. POST /print
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
        return sendJson(res, 200, { success: true, message: result.message });
      } catch (err: any) {
        return sendJson(res, 502, { success: false, error: err.message || 'Thermal print job failed' });
      }
    }

    // 4. POST /raw
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
  const server = createPrintAgentServer();
  server.listen(PORT, HOST, () => {
    console.log(`=======================================================`);
    console.log(`🚀 The Scan Menu Local Print Agent v1.0.0 is Running!`);
    console.log(`📍 Listening on: http://${HOST}:${PORT}`);
    console.log(`🔌 Ready to transmit ESC/POS tickets to LAN thermal POS`);
    console.log(`=======================================================`);
  });

  return server;
}
