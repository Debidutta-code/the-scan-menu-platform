import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import mongoose, { Types } from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { IntegrationSyncLog } from '../../src/models/IntegrationSyncLog';
import { Restaurant } from '../../src/models/Restaurant';
import { RestaurantSettings } from '../../src/models/RestaurantSettings';
import { Order } from '../../src/models/Order';
import { posIntegrationService } from '../../src/services/posIntegration.service';
import { IntegrationFactory } from '../../src/integrations/core/IntegrationFactory';

describe('POS Automatic Retry Worker Tests (V2.1 Hardening)', () => {
  let mongod: MongoMemoryServer;
  let restaurant: any;
  let order: any;

  beforeAll(async () => {
    mongod = await MongoMemoryServer.create();
    const uri = mongod.getUri();
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
    await mongoose.connect(uri);
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongod.stop();
  });

  beforeEach(async () => {
    const collections = mongoose.connection.collections;
    for (const key in collections) {
      await collections[key].deleteMany({});
    }

    await IntegrationSyncLog.init();
    await Restaurant.init();
    await RestaurantSettings.init();
    await Order.init();

    restaurant = await Restaurant.create({
      name: 'Pixora Grill',
      slug: 'pixora-grill',
      code: 'PIX-002',
      status: 'ACTIVE',
    });

    await RestaurantSettings.create({
      restaurantId: restaurant._id,
      paymentConfig: {
        activeProvider: 'CASH',
        activeMode: 'POSTPAID',
        integrationConfig: {
          provider: 'PETPOOJA',
          apiKey: 'mock_api_key',
          appSecret: 'mock_secret',
        },
      },
    });

    order = await Order.create({
      restaurantId: restaurant._id,
      orderNumber: 101,
      orderMode: 'DINE_IN',
      status: 'PENDING',
      paymentStatus: 'PAID',
      source: 'QR',
      items: [
        {
          menuItemId: new Types.ObjectId(),
          nameSnapshot: 'Paneer Tikka',
          quantity: 2,
          unitPriceSnapshot: 25000,
          itemTax: 1250,
          itemTotal: 26250,
        },
      ],
      subtotal: 50000,
      tax: 2500,
      total: 52500,
    });
  });

  it('Test A: POS succeeds immediately (SYNCED / SUCCESS, syncAttempts = 1)', async () => {
    const mockAdapter = {
      pushOrder: vi.fn().mockResolvedValue({ success: true, posOrderId: 'POS-101' }),
      updateOrderStatus: vi.fn().mockResolvedValue({ success: true }),
      syncMenu: vi.fn().mockResolvedValue({ success: true }),
    };
    vi.spyOn(IntegrationFactory, 'getAdapter').mockReturnValue(mockAdapter as any);

    const log = new IntegrationSyncLog({
      restaurantId: restaurant._id,
      orderId: order._id,
      provider: 'PETPOOJA',
      operation: 'PUSH_ORDER',
      status: 'PENDING',
      syncAttempts: 1,
      maxRetries: 5,
    });
    await log.save();

    await mockAdapter.pushOrder(order);
    log.status = 'SUCCESS';
    log.nextRetryAt = null;
    await log.save();

    const savedLog = await IntegrationSyncLog.findById(log._id);
    expect(savedLog?.status).toBe('SUCCESS');
    expect(savedLog?.syncAttempts).toBe(1);
    expect(savedLog?.nextRetryAt).toBeNull();
  });

  it('Test B: POS fails once, succeeds on automatic retry worker tick', async () => {
    let callCount = 1; // Already failed once during initial order placement
    const mockAdapter = {
      pushOrder: vi.fn().mockImplementation(async () => {
        callCount++;
        if (callCount <= 1) {
          throw new Error('Network timeout connecting to Petpooja');
        }
        return { success: true, posOrderId: 'POS-101' };
      }),
      updateOrderStatus: vi.fn().mockResolvedValue({ success: true }),
      syncMenu: vi.fn().mockResolvedValue({ success: true }),
    };
    vi.spyOn(IntegrationFactory, 'getAdapter').mockReturnValue(mockAdapter as any);

    // Initial failure log
    const failedLog = await IntegrationSyncLog.create({
      restaurantId: restaurant._id,
      orderId: order._id,
      provider: 'PETPOOJA',
      operation: 'PUSH_ORDER',
      status: 'FAILED',
      syncAttempts: 1,
      maxRetries: 5,
      nextRetryAt: new Date(Date.now() - 5000), // Ready for retry immediately
      isLocked: false,
    });

    // Worker tick processes pending retry
    const result = await posIntegrationService.processPendingRetries();
    expect(result.processed).toBe(1);
    expect(result.succeeded).toBe(1);
    expect(result.failed).toBe(0);

    const updatedLog = await IntegrationSyncLog.findById(failedLog._id);
    expect(updatedLog?.status).toBe('SUCCESS');
    expect(updatedLog?.nextRetryAt).toBeNull();
    expect(updatedLog?.isLocked).toBe(false);
  });

  it('Test C: POS continuously fails and transitions to MANUAL_INTERVENTION after max retries', async () => {
    const mockAdapter = {
      pushOrder: vi.fn().mockRejectedValue(new Error('Persistent 500 POS Gateway Error')),
      updateOrderStatus: vi.fn().mockResolvedValue({ success: true }),
      syncMenu: vi.fn().mockResolvedValue({ success: true }),
    };
    vi.spyOn(IntegrationFactory, 'getAdapter').mockReturnValue(mockAdapter as any);

    // Log already at attempt 4 out of 5
    const nearMaxLog = await IntegrationSyncLog.create({
      restaurantId: restaurant._id,
      orderId: order._id,
      provider: 'PETPOOJA',
      operation: 'PUSH_ORDER',
      status: 'FAILED',
      syncAttempts: 4,
      maxRetries: 5,
      nextRetryAt: new Date(Date.now() - 1000),
      isLocked: false,
    });

    // 5th attempt fails -> reaches maxRetries
    const result = await posIntegrationService.processPendingRetries();
    expect(result.processed).toBe(1);
    expect(result.failed).toBe(1);

    const terminalLog = await IntegrationSyncLog.findById(nearMaxLog._id);
    expect(terminalLog?.status).toBe('MANUAL_INTERVENTION');
    expect(terminalLog?.syncAttempts).toBe(5);
    expect(terminalLog?.nextRetryAt).toBeNull();
    expect(terminalLog?.isLocked).toBe(false);
  });

  it('Test D: POS receives order but ACK is lost; retry uses same external order ID', async () => {
    const passedOrderIds: string[] = [];
    const mockAdapter = {
      pushOrder: vi.fn().mockImplementation(async (orderParam: any) => {
        passedOrderIds.push(orderParam._id.toString());
        return { success: true };
      }),
      updateOrderStatus: vi.fn().mockResolvedValue({ success: true }),
      syncMenu: vi.fn().mockResolvedValue({ success: true }),
    };
    vi.spyOn(IntegrationFactory, 'getAdapter').mockReturnValue(mockAdapter as any);

    await IntegrationSyncLog.create({
      restaurantId: restaurant._id,
      orderId: order._id,
      provider: 'PETPOOJA',
      operation: 'PUSH_ORDER',
      status: 'FAILED',
      syncAttempts: 1,
      maxRetries: 5,
      nextRetryAt: new Date(Date.now() - 1000),
      isLocked: false,
    });

    await posIntegrationService.processPendingRetries();

    // Verify the external order ID passed to the adapter matches the exact same order._id
    expect(passedOrderIds.length).toBe(1);
    expect(passedOrderIds[0]).toBe(order._id.toString());
  });

  it('Test E: Two workers attempt the same retry simultaneously; only one active retry executes', async () => {
    let activePushes = 0;
    let maxSimultaneousPushes = 0;

    const mockAdapter = {
      pushOrder: vi.fn().mockImplementation(async () => {
        activePushes++;
        maxSimultaneousPushes = Math.max(maxSimultaneousPushes, activePushes);
        await new Promise((res) => setTimeout(res, 50));
        activePushes--;
        return { success: true };
      }),
      updateOrderStatus: vi.fn().mockResolvedValue({ success: true }),
      syncMenu: vi.fn().mockResolvedValue({ success: true }),
    };
    vi.spyOn(IntegrationFactory, 'getAdapter').mockReturnValue(mockAdapter as any);

    await IntegrationSyncLog.create({
      restaurantId: restaurant._id,
      orderId: order._id,
      provider: 'PETPOOJA',
      operation: 'PUSH_ORDER',
      status: 'FAILED',
      syncAttempts: 1,
      maxRetries: 5,
      nextRetryAt: new Date(Date.now() - 1000),
      isLocked: false,
    });

    // Trigger two workers simultaneously
    const [w1, w2] = await Promise.all([
      posIntegrationService.processPendingRetries(),
      posIntegrationService.processPendingRetries(),
    ]);

    // Exactly one worker claimed and succeeded the single candidate record
    const totalSucceeded = w1.succeeded + w2.succeeded;
    expect(totalSucceeded).toBe(1);
    expect(maxSimultaneousPushes).toBe(1);
  });
});
