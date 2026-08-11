import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { DiningSession } from '../../src/models/DiningSession';
import { GuestSession } from '../../src/models/GuestSession';
import { Bill } from '../../src/models/Bill';
import { Order } from '../../src/models/Order';
import { diningSessionService } from '../../src/services/diningSession.service';
import { billService } from '../../src/services/bill.service';

describe('DiningSession & Versioned Bill Unit Tests', () => {
  let mongod: MongoMemoryServer;

  beforeEach(async () => {
    mongod = await MongoMemoryServer.create();
    const uri = mongod.getUri();
    await mongoose.connect(uri);
    await DiningSession.init();
    await GuestSession.init();
    await Bill.init();
    await Order.init();
  });

  afterEach(async () => {
    await mongoose.disconnect();
    await mongod.stop();
  });

  it('should enforce only ONE active dining session per physical table', async () => {
    const restaurantId = new mongoose.Types.ObjectId();
    const tableId = new mongoose.Types.ObjectId();

    const session1 = new DiningSession({
      restaurantId,
      tableId,
      sessionCode: 'S-1001',
      joinPin: '1234',
      status: 'ACTIVE',
      paymentMode: 'POSTPAID',
    });
    await session1.save();

    const session2 = new DiningSession({
      restaurantId,
      tableId,
      sessionCode: 'S-1002',
      joinPin: '5678',
      status: 'ACTIVE',
      paymentMode: 'POSTPAID',
    });

    // Should reject duplicate active session for the same table
    await expect(session2.save()).rejects.toThrow();
  });

  it('should allow a new session after previous session is SETTLED or CLOSED', async () => {
    const restaurantId = new mongoose.Types.ObjectId();
    const tableId = new mongoose.Types.ObjectId();

    const session1 = new DiningSession({
      restaurantId,
      tableId,
      sessionCode: 'S-1001',
      joinPin: '1234',
      status: 'SETTLED',
      paymentMode: 'POSTPAID',
    });
    await session1.save();

    const session2 = new DiningSession({
      restaurantId,
      tableId,
      sessionCode: 'S-1002',
      joinPin: '5678',
      status: 'ACTIVE',
      paymentMode: 'POSTPAID',
    });

    await expect(session2.save()).resolves.toBeDefined();
  });

  it('should support multi-guest joining with 4-digit PIN', async () => {
    const restaurantId = new mongoose.Types.ObjectId();
    const tableId = new mongoose.Types.ObjectId();

    // Host opens session
    const hostResult = await diningSessionService.joinOrCreateSession(
      restaurantId,
      tableId,
      'Alice',
      undefined,
      false,
      'POSTPAID'
    );

    expect(hostResult.diningSession.status).toBe('ACTIVE');
    expect(hostResult.guestSession.isHost).toBe(true);
    expect(hostResult.guestSession.guestName).toBe('Alice');

    // Companion joins using correct PIN
    const companionResult = await diningSessionService.joinOrCreateSession(
      restaurantId,
      tableId,
      'Bob',
      hostResult.diningSession.joinPin,
      false,
      'POSTPAID'
    );

    expect(companionResult.diningSession._id.toString()).toBe(hostResult.diningSession._id.toString());
    expect(companionResult.guestSession.isHost).toBe(false);
    expect(companionResult.guestSession.guestName).toBe('Bob');
    expect(companionResult.guestToken).not.toBe(hostResult.guestToken);

    // Companion fails with wrong PIN
    await expect(
      diningSessionService.joinOrCreateSession(
        restaurantId,
        tableId,
        'Eve',
        '0000',
        false,
        'POSTPAID'
      )
    ).rejects.toThrow('Incorrect table join code.');
  });

  it('should correctly handle bill versioning when customer resumes ordering', async () => {
    const restaurantId = new mongoose.Types.ObjectId();
    const tableId = new mongoose.Types.ObjectId();

    const session = await DiningSession.create({
      restaurantId,
      tableId,
      sessionCode: 'S-1001',
      joinPin: '1234',
      status: 'ACTIVE',
      paymentMode: 'POSTPAID',
      roundCount: 1,
      subtotal: 50000, // ₹500 in paise
      tax: 2500, // ₹25 in paise
      total: 52500,
      balanceDue: 52500,
    });

    await Order.create({
      restaurantId,
      tableId,
      diningSessionId: session._id,
      orderNumber: 1,
      items: [
        {
          menuItemId: new mongoose.Types.ObjectId(),
          nameSnapshot: 'Pasta',
          unitPriceSnapshot: 50000,
          quantity: 1,
          selectedAddOns: [],
          itemSubtotal: 50000,
          itemTax: 2500,
          itemTotal: 52500,
          itemStatus: 'SERVED',
        },
      ],
      subtotal: 50000,
      tax: 2500,
      taxBreakdown: [],
      total: 52500,
      status: 'SERVED',
      source: 'QR',
      paymentStatus: 'PENDING',
    });

    // Request Bill (Version 1)
    const billV1 = await billService.requestOrGenerateBill(restaurantId, session._id);
    expect(billV1.version).toBe(1);
    expect(billV1.status).toBe('PENDING');

    // Customer decides to add dessert -> Resume ordering
    const reopenedSession = await billService.reopenSessionForOrdering(restaurantId, session._id);
    expect(reopenedSession.status).toBe('ACTIVE');

    const updatedBillV1 = await Bill.findById(billV1._id);
    expect(updatedBillV1?.status).toBe('SUPERSEDED');

    // Customer adds dessert
    await Order.create({
      restaurantId,
      tableId,
      diningSessionId: session._id,
      orderNumber: 2,
      items: [
        {
          menuItemId: new mongoose.Types.ObjectId(),
          nameSnapshot: 'Tiramisu',
          unitPriceSnapshot: 20000,
          quantity: 1,
          selectedAddOns: [],
          itemSubtotal: 20000,
          itemTax: 1000,
          itemTotal: 21000,
          itemStatus: 'SERVED',
        },
      ],
      subtotal: 20000,
      tax: 1000,
      taxBreakdown: [],
      total: 21000,
      status: 'SERVED',
      source: 'QR',
      paymentStatus: 'PENDING',
    });

    // Request Bill again (Version 2)
    const billV2 = await billService.requestOrGenerateBill(restaurantId, session._id);
    expect(billV2.version).toBe(2);
    expect(billV2.status).toBe('PENDING');
    expect(billV2.grossAmount).toBe(70000); // ₹700 (Pasta + Tiramisu)
  });
});
