import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import http from 'http';
import { createPrintAgentServer } from '../src/server';
import { buildCustomerBillBuffer, buildKOTBuffer, buildTestSlipBuffer } from '../src/formatter';

describe('ScanMenu Local Print Agent Unit & Integration Tests', () => {
  let server: http.Server;
  const TEST_PORT = 18189;

  beforeAll(async () => {
    server = createPrintAgentServer();
    await new Promise<void>((resolve) => {
      server.listen(TEST_PORT, '127.0.0.1', () => resolve());
    });
  });

  afterAll(async () => {
    await new Promise<void>((resolve) => {
      server.close(() => resolve());
    });
  });

  it('GET /health returns 200 with service info', async () => {
    const res = await fetch(`http://127.0.0.1:${TEST_PORT}/health`);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe('ok');
    expect(body.service).toBe('scanmenu-print-agent');
    expect(body.version).toBe('1.0.0');
  });

  it('generates valid 80mm customer bill buffer with column wrapping and tax breakdown', () => {
    const buffer = buildCustomerBillBuffer(
      {
        orderNumber: 102,
        orderMode: 'DINE_IN',
        tableName: 'Table 2',
        customerName: 'Alice',
        items: [
          {
            name: 'Pizza & Craft Mojito Duo Pack',
            quantity: 1,
            price: 44900,
            selectedAddOns: [{ name: 'Extra Cheese', price: 5000 }],
            specialInstructions: 'Crispy thin crust',
          },
          {
            name: 'Woodfired Hot Fudge Skillet Cookie',
            quantity: 1,
            price: 26000,
          },
        ],
        subtotal: 70900,
        tax: 3546,
        total: 74446,
        paymentStatus: 'PAID',
        paymentMethod: 'CASH',
      },
      {
        name: 'DEMO CAFE',
        address: '123 Example Road, Bangalore',
        gstNumber: '29ABCDE1234F1Z5',
      },
      '80mm'
    );

    expect(buffer.length).toBeGreaterThan(100);
    const text = buffer.toString('utf-8');
    expect(text).toContain('DEMO CAFE');
    expect(text).toContain('ORDER #102');
    expect(text).toContain('TABLE: Table 2');
    expect(text).toContain('Pizza & Craft Mojito Duo Pack');
    expect(text).toContain('Woodfired Hot Fudge Skillet');
    expect(text).toContain('Cookie');
    expect(text).toContain('Rs. 744.46');
    expect(text).toContain('PAID (CASH)');
  });

  it('generates valid KOT buffer without restaurant logo or branding', () => {
    const kotBuf = buildKOTBuffer(
      {
        orderNumber: 105,
        orderMode: 'DINE_IN',
        tableName: 'Table 5',
        serverName: 'Vikram',
        items: [
          {
            name: 'Chicken Lasagna',
            quantity: 2,
            specialInstructions: 'Less cheese, extra oregano',
          },
        ],
      },
      '80mm'
    );

    expect(kotBuf.length).toBeGreaterThan(50);
    const kotText = kotBuf.toString('utf-8');
    expect(kotText).toContain('KITCHEN ORDER TICKET');
    expect(kotText).toContain('ORDER #105');
    expect(kotText).toContain('Chicken Lasagna');
    expect(kotText).toContain('x2');
    expect(kotText).toContain('Less cheese, extra oregano');
  });

  it('generates representative thermal test slip', () => {
    const testBuf = buildTestSlipBuffer('192.168.1.100', 9100, '80mm', 'Demo Cafe', 'Counter Printer');
    expect(testBuf.length).toBeGreaterThan(50);
    const testText = testBuf.toString('utf-8');
    expect(testText).toContain('Demo Cafe');
    expect(testText).toContain('THERMAL TEST');
    expect(testText).toContain('Counter Printer');
    expect(testText).toContain('192.168.1.100:9100');
    expect(testText).toContain('Connection successful');
  });

  it('rejects SSRF attacks to localhost, cloud metadata, or reserved system ports', async () => {
    const { validatePrinterAddress } = await import('../src/tcpClient');

    // Rejects loopback / local system probing
    expect(() => validatePrinterAddress('127.0.0.1', 9100)).toThrow(/loopback address/);
    expect(() => validatePrinterAddress('localhost', 9100)).toThrow(/loopback address/);
    expect(() => validatePrinterAddress('0.0.0.0', 9100)).toThrow(/loopback address/);

    // Rejects AWS / GCP metadata probing
    expect(() => validatePrinterAddress('169.254.169.254', 9100)).toThrow(/link-local/);

    // Rejects non-printer sensitive ports (e.g. SSH, HTTP, DB)
    expect(() => validatePrinterAddress('192.168.1.100', 22)).toThrow(/reserved system service/);
    expect(() => validatePrinterAddress('192.168.1.100', 80)).toThrow(/reserved system service/);
    expect(() => validatePrinterAddress('192.168.1.100', 443)).toThrow(/reserved system service/);
    expect(() => validatePrinterAddress('192.168.1.100', 3306)).toThrow(/reserved system service/);

    // Accepts valid LAN printer ports
    expect(() => validatePrinterAddress('192.168.1.100', 9100)).not.toThrow();
    expect(() => validatePrinterAddress('10.0.0.55', 9100)).not.toThrow();
  });
});
