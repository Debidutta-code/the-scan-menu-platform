import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { app } from '../../src/index';
import { Restaurant } from '../../src/models/Restaurant';
import { RestaurantSettings } from '../../src/models/RestaurantSettings';
import { Table } from '../../src/models/Table';
import { Category } from '../../src/models/Category';
import { MenuItem } from '../../src/models/MenuItem';
import { DiningSession } from '../../src/models/DiningSession';
import { GuestSession } from '../../src/models/GuestSession';
import { Order } from '../../src/models/Order';
import { Bill } from '../../src/models/Bill';
import { Payment } from '../../src/models/Payment';
import { CheckoutAttempt } from '../../src/models/CheckoutAttempt';
import { User } from '../../src/models/User';
import { RestaurantStaff } from '../../src/models/RestaurantStaff';
import { TokenService } from '../../src/services/token.service';

describe('Approved Architecture V2.1 Integration Test Suite', () => {
  let mongod: MongoMemoryServer;
  let restaurant: any;
  let table: any;
  let category: any;
  let pizzaItem: any;
  let coffeeItem: any;
  let dessertItem: any;
  let managerToken: string;

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

    await DiningSession.init();
    await GuestSession.init();
    await Order.init();
    await Bill.init();
    await Payment.init();
    await CheckoutAttempt.init();

    // Create Restaurant
    restaurant = await Restaurant.create({
      name: 'Pixora Bistro',
      slug: 'pixora-bistro',
      code: 'PIX-001',
      status: 'ACTIVE',
    });

    await RestaurantSettings.create({
      restaurantId: restaurant._id,
      paymentConfig: {
        activeProvider: 'CASH',
        activeMode: 'POSTPAID',
      },
    });

    // Create Manager User
    const managerUser = await User.create({
      email: 'manager@pixorabistro.com',
      passwordHash: 'hashed_pw',
      name: 'Manager Bob',
      role: 'MANAGER',
      status: 'ACTIVE',
    });

    await RestaurantStaff.create({
      userId: managerUser._id,
      restaurantId: restaurant._id,
      role: 'MANAGER',
      status: 'ACTIVE',
    });

    const tokenService = new TokenService();
    managerToken = tokenService.generateAccessToken({
      id: managerUser._id.toString(),
      email: managerUser.email,
      role: 'MANAGER',
    });

    // Create Physical Table
    table = await Table.create({
      restaurantId: restaurant._id,
      tableNumber: '12',
      displayName: 'Table 12',
      token: 'tok_table12_secure',
      qrCodeUrl: '/api/v1/restaurants/pixora-bistro/tables/tok_table12_secure/qr',
      isActive: true,
    });

    // Create Menu
    category = await Category.create({
      restaurantId: restaurant._id,
      name: 'Mains',
      sortOrder: 1,
      isActive: true,
    });

    pizzaItem = await MenuItem.create({
      restaurantId: restaurant._id,
      categoryId: category._id,
      name: 'Margarita Pizza',
      price: 42000, // ₹420.00
      isAvailable: true,
    });

    coffeeItem = await MenuItem.create({
      restaurantId: restaurant._id,
      categoryId: category._id,
      name: 'Cappuccino',
      price: 18000, // ₹180.00
      isAvailable: true,
    });

    dessertItem = await MenuItem.create({
      restaurantId: restaurant._id,
      categoryId: category._id,
      name: 'Tiramisu',
      price: 25000, // ₹250.00
      isAvailable: true,
    });
  });

  it('Flow 1: Fresh Table Resolution -> Join -> Immutable Postpaid Order', async () => {
    const scanRes = await request(app)
      .get(`/api/v1/public/restaurants/${restaurant.slug}/tables/${table.token}`);
    expect(scanRes.status).toBe(200);
    expect(scanRes.body.success).toBe(true);
    expect(scanRes.body.data.status).toBe('NO_ACTIVE_SESSION');
    expect(scanRes.body.data.hasOngoingMeal).toBe(false);

    const joinRes = await request(app)
      .post(`/api/v1/public/restaurants/${restaurant.slug}/tables/${table.token}/join`)
      .send({ guestName: 'Alice' });

    expect(joinRes.status).toBe(201);
    expect(joinRes.body.success).toBe(true);
    const { guestToken, diningSession } = joinRes.body.data;
    expect(guestToken).toBeDefined();
    expect(diningSession.status).toBe('ACTIVE');
    expect(diningSession.joinPin).toBeDefined();

    const orderRes = await request(app)
      .post(`/api/v1/public/restaurants/${restaurant.slug}/tables/${table.token}/orders`)
      .set('x-guest-token', guestToken)
      .send({
        diningSessionId: diningSession._id,
        items: [{ itemId: coffeeItem._id.toString(), quantity: 2 }],
      });

    expect(orderRes.status).toBe(201);
    expect(orderRes.body.success).toBe(true);
    const order1 = orderRes.body.data;
    expect(order1.orderNumber).toBe(1);
    expect(order1.roundNumber).toBe(1);
    expect(order1.subtotal).toBe(36000);

    const updatedSession = await DiningSession.findById(diningSession._id);
    expect(updatedSession?.roundCount).toBe(1);
    expect(updatedSession?.subtotal).toBe(36000);
    expect(updatedSession?.balanceDue).toBe(36000);
  });

  it('Flow 2: Multi-Guest Collaboration & Token Fence Protection', async () => {
    const hostJoin = await request(app)
      .post(`/api/v1/public/restaurants/${restaurant.slug}/tables/${table.token}/join`)
      .send({ guestName: 'Alice' });
    const hostToken = hostJoin.body.data.guestToken;
    const session = hostJoin.body.data.diningSession;

    await request(app)
      .post(`/api/v1/public/restaurants/${restaurant.slug}/tables/${table.token}/orders`)
      .set('x-guest-token', hostToken)
      .send({
        diningSessionId: session._id,
        items: [{ itemId: pizzaItem._id.toString(), quantity: 1 }],
      });

    const unknownScan = await request(app)
      .get(`/api/v1/public/restaurants/${restaurant.slug}/tables/${table.token}`);
    expect(unknownScan.status).toBe(200);
    expect(unknownScan.body.data.status).toBe('ONGOING_MEAL_PROTECTION');
    expect(unknownScan.body.data.hasOngoingMeal).toBe(true);

    const charlieJoin = await request(app)
      .post(`/api/v1/public/restaurants/${restaurant.slug}/tables/${table.token}/join`)
      .send({ guestName: 'Charlie', joinPin: session.joinPin });

    expect(charlieJoin.status).toBe(201);
    const charlieToken = charlieJoin.body.data.guestToken;

    const charlieOrder = await request(app)
      .post(`/api/v1/public/restaurants/${restaurant.slug}/tables/${table.token}/orders`)
      .set('x-guest-token', charlieToken)
      .send({
        diningSessionId: session._id,
        items: [{ itemId: coffeeItem._id.toString(), quantity: 1 }],
      });

    expect(charlieOrder.status).toBe(201);
    expect(charlieOrder.body.data.roundNumber).toBe(2);
    expect(charlieOrder.body.data.orderNumber).toBe(2);

    const freshSession = await DiningSession.findById(session._id);
    expect(freshSession?.roundCount).toBe(2);
    expect(freshSession?.subtotal).toBe(60000);
  });

  it('Flow 3: Postpaid Bill Generation & Settlement', async () => {
    const hostJoin = await request(app)
      .post(`/api/v1/public/restaurants/${restaurant.slug}/tables/${table.token}/join`)
      .send({ guestName: 'Alice' });
    const session = hostJoin.body.data.diningSession;

    await request(app)
      .post(`/api/v1/public/restaurants/${restaurant.slug}/tables/${table.token}/orders`)
      .send({
        diningSessionId: session._id,
        items: [{ itemId: pizzaItem._id.toString(), quantity: 1 }],
      });

    const billReq = await request(app)
      .post(`/api/v1/public/restaurants/${restaurant.slug}/table-sessions/${session._id}/bill/request`)
      .set('x-table-token', table.token);
    expect(billReq.status).toBe(200);
    expect(billReq.body.success).toBe(true);
    const bill = billReq.body.data;
    expect(bill.status).toBe('PENDING');
    expect(bill.netAmount).toBe(42000);

    const settleRes = await request(app)
      .post(`/api/v1/restaurants/${restaurant._id}/table-sessions/${session._id}/settle`)
      .set('Authorization', `Bearer ${managerToken}`)
      .send({
        payments: [
          { method: 'CASH', amount: 20000 },
          { method: 'CARD', amount: 22000 },
        ],
      });

    expect(settleRes.status).toBe(200);
    expect(settleRes.body.data.bill.status).toBe('SETTLED');
    expect(settleRes.body.data.session.status).toBe('SETTLED');
    expect(settleRes.body.data.session.balanceDue).toBe(0);

    const nextScan = await request(app)
      .get(`/api/v1/public/restaurants/${restaurant.slug}/tables/${table.token}`);
    expect(nextScan.status).toBe(200);
    expect(nextScan.body.data.status).toBe('NO_ACTIVE_SESSION');
  });

  it('Flow 4: Walkout Recovery (Customer Leaves Without Paying)', async () => {
    const hostJoin = await request(app)
      .post(`/api/v1/public/restaurants/${restaurant.slug}/tables/${table.token}/join`)
      .send({ guestName: 'Customer A' });
    const sessionA = hostJoin.body.data.diningSession;

    await request(app)
      .post(`/api/v1/public/restaurants/${restaurant.slug}/tables/${table.token}/orders`)
      .send({
        diningSessionId: sessionA._id,
        items: [{ itemId: pizzaItem._id.toString(), quantity: 2 }],
      });

    const scanB = await request(app)
      .get(`/api/v1/public/restaurants/${restaurant.slug}/tables/${table.token}`);
    expect(scanB.body.data.status).toBe('ONGOING_MEAL_PROTECTION');

    const abandonRes = await request(app)
      .post(`/api/v1/restaurants/${restaurant._id}/table-sessions/${sessionA._id}/abandon`)
      .set('Authorization', `Bearer ${managerToken}`)
      .send({ reason: 'Diners left table without paying' });

    expect(abandonRes.status).toBe(200);
    expect(abandonRes.body.data.status).toBe('ABANDONED');

    const scanBAfter = await request(app)
      .get(`/api/v1/public/restaurants/${restaurant.slug}/tables/${table.token}`);
    expect(scanBAfter.body.data.status).toBe('NO_ACTIVE_SESSION');
    expect(scanBAfter.body.data.hasOngoingMeal).toBe(false);
  });

  it('Flow 5: Prepaid Ordering (CheckoutAttempt -> Payment Captured -> Immutable PAID Order)', async () => {
    const checkoutRes = await request(app)
      .post(`/api/v1/public/restaurants/${restaurant.slug}/tables/${table.token}/checkout/prepaid`)
      .send({
        items: [{ itemId: pizzaItem._id.toString(), quantity: 1 }],
        customerName: 'Prepaid Diner',
      });

    expect(checkoutRes.status).toBe(201);
    expect(checkoutRes.body.success).toBe(true);
    const { checkoutAttempt } = checkoutRes.body.data;
    expect(checkoutAttempt.status).toBe('PAYMENT_PENDING');
    expect(checkoutAttempt.total).toBe(42000);

    const confirmRes = await request(app)
      .post('/api/v1/public/checkout/prepaid/confirm')
      .send({
        checkoutAttemptId: checkoutAttempt._id,
        gatewayPaymentId: 'pay_rzp_mock_12345',
      });

    expect(confirmRes.status).toBe(200);
    expect(confirmRes.body.success).toBe(true);
    const order = confirmRes.body.data;
    expect(order.paymentStatus).toBe('PAID');
    expect(order.status).toBe('PENDING');
    expect(order.total).toBe(42000);

    const attemptInDb = await CheckoutAttempt.findById(checkoutAttempt._id);
    expect(attemptInDb?.status).toBe('ORDER_CREATED');
    expect(attemptInDb?.orderId?.toString()).toBe(order._id.toString());
  });

  it('Flow 6: Postpaid Multi-round Order & Settled Session Rejection', async () => {
    const hostJoin = await request(app)
      .post(`/api/v1/public/restaurants/${restaurant.slug}/tables/${table.token}/join`)
      .send({ guestName: 'Alice' });
    const session = hostJoin.body.data.diningSession;

    // Round 1
    const order1 = await request(app)
      .post(`/api/v1/public/restaurants/${restaurant.slug}/tables/${table.token}/orders`)
      .send({
        diningSessionId: session._id,
        items: [{ itemId: pizzaItem._id.toString(), quantity: 1 }],
      });
    expect(order1.status).toBe(201);
    expect(order1.body.data.orderNumber).toBe(1);

    // Round 2
    const order2 = await request(app)
      .post(`/api/v1/public/restaurants/${restaurant.slug}/tables/${table.token}/orders`)
      .send({
        diningSessionId: session._id,
        items: [{ itemId: coffeeItem._id.toString(), quantity: 1 }],
      });
    expect(order2.status).toBe(201);
    expect(order2.body.data.orderNumber).toBe(2);

    // Settle Session
    await request(app)
      .post(`/api/v1/restaurants/${restaurant._id}/table-sessions/${session._id}/settle`)
      .set('Authorization', `Bearer ${managerToken}`)
      .send({
        payments: [{ method: 'CASH', amount: 60000 }],
      });

    // Attempt Round 3 on settled session -> MUST FAIL with 409
    const order3 = await request(app)
      .post(`/api/v1/public/restaurants/${restaurant.slug}/tables/${table.token}/orders`)
      .send({
        diningSessionId: session._id,
        items: [{ itemId: dessertItem._id.toString(), quantity: 1 }],
      });

    expect(order3.status).toBe(409);
    expect(order3.body.success).toBe(false);
  });

  it('Flow 7: Bill Reopening for Add-on Dessert (Version 1 SUPERSEDED -> Version 2)', async () => {
    const hostJoin = await request(app)
      .post(`/api/v1/public/restaurants/${restaurant.slug}/tables/${table.token}/join`)
      .send({ guestName: 'Alice' });
    const session = hostJoin.body.data.diningSession;

    // Order Pizza (₹420)
    await request(app)
      .post(`/api/v1/public/restaurants/${restaurant.slug}/tables/${table.token}/orders`)
      .send({
        diningSessionId: session._id,
        items: [{ itemId: pizzaItem._id.toString(), quantity: 1 }],
      });

    // Request Bill (Version 1 = ₹420)
    const billV1 = await request(app)
      .post(`/api/v1/public/restaurants/${restaurant.slug}/table-sessions/${session._id}/bill/request`)
      .set('x-table-token', table.token);
    expect(billV1.body.data.version).toBe(1);
    expect(billV1.body.data.netAmount).toBe(42000);

    // Attempting to place order directly while in BILL_REQUESTED -> fails with 409
    const directOrder = await request(app)
      .post(`/api/v1/public/restaurants/${restaurant.slug}/tables/${table.token}/orders`)
      .send({
        diningSessionId: session._id,
        items: [{ itemId: dessertItem._id.toString(), quantity: 1 }],
      });
    expect(directOrder.status).toBe(409);
    expect(directOrder.body.error.code).toBe('SESSION_BILL_REQUESTED');

    // Customer clicks "Order More" -> staff reopens the session
    const reopenRes = await request(app)
      .post(`/api/v1/restaurants/${restaurant._id}/table-sessions/${session._id}/reopen`)
      .set('Authorization', `Bearer ${managerToken}`);
    expect(reopenRes.status).toBe(200);

    // Verify Bill v1 is now SUPERSEDED
    const billV1Doc = await Bill.findById(billV1.body.data._id);
    expect(billV1Doc?.status).toBe('SUPERSEDED');

    // Place Dessert Order (₹250)
    const dessertOrder = await request(app)
      .post(`/api/v1/public/restaurants/${restaurant.slug}/tables/${table.token}/orders`)
      .send({
        diningSessionId: session._id,
        items: [{ itemId: dessertItem._id.toString(), quantity: 1 }],
      });
    expect(dessertOrder.status).toBe(201);

    // Request Bill (Version 2 = ₹420 + ₹250 = ₹670)
    const billV2 = await request(app)
      .post(`/api/v1/public/restaurants/${restaurant.slug}/table-sessions/${session._id}/bill/request`)
      .set('x-table-token', table.token);
    expect(billV2.body.data.version).toBe(2);
    expect(billV2.body.data.netAmount).toBe(67000);
  });

  it('Flow 8: Multi-Tender Payment Split & Overpayment Rejection', async () => {
    const hostJoin = await request(app)
      .post(`/api/v1/public/restaurants/${restaurant.slug}/tables/${table.token}/join`)
      .send({ guestName: 'Alice' });
    const session = hostJoin.body.data.diningSession;

    await request(app)
      .post(`/api/v1/public/restaurants/${restaurant.slug}/tables/${table.token}/orders`)
      .send({
        diningSessionId: session._id,
        items: [
          { itemId: pizzaItem._id.toString(), quantity: 1 }, // 420
          { itemId: dessertItem._id.toString(), quantity: 1 }, // 250 -> Total 670
        ],
      });

    // Overpayment attempt: Trying to pay ₹1000 against ₹670 bill -> MUST REJECT (400)
    const overpayRes = await request(app)
      .post(`/api/v1/restaurants/${restaurant._id}/table-sessions/${session._id}/settle`)
      .set('Authorization', `Bearer ${managerToken}`)
      .send({
        payments: [
          { method: 'CASH', amount: 50000 },
          { method: 'UPI', amount: 50000 }, // Total 100000 > 67000
        ],
      });

    expect(overpayRes.status).toBe(400);
    expect(overpayRes.body.error.code).toBe('PAYMENT_EXCEEDS_BALANCE');

    // Exact split payment: ₹400 Cash + ₹270 UPI = ₹670 -> SUCCEEDS
    const exactPayRes = await request(app)
      .post(`/api/v1/restaurants/${restaurant._id}/table-sessions/${session._id}/settle`)
      .set('Authorization', `Bearer ${managerToken}`)
      .send({
        payments: [
          { method: 'CASH', amount: 40000 },
          { method: 'UPI', amount: 27000 },
        ],
      });

    expect(exactPayRes.status).toBe(200);
    expect(exactPayRes.body.data.session.status).toBe('SETTLED');
    expect(exactPayRes.body.data.session.balanceDue).toBe(0);

    const payments = await Payment.find({ diningSessionId: session._id });
    expect(payments.length).toBe(2);
  });

  it('Flow 9: Waiter Counter Ordering attaching to existing DiningSession', async () => {
    const hostJoin = await request(app)
      .post(`/api/v1/public/restaurants/${restaurant.slug}/tables/${table.token}/join`)
      .send({ guestName: 'Alice' });
    const session = hostJoin.body.data.diningSession;

    // Customer places Round 1 via QR
    await request(app)
      .post(`/api/v1/public/restaurants/${restaurant.slug}/tables/${table.token}/orders`)
      .send({
        diningSessionId: session._id,
        items: [{ itemId: coffeeItem._id.toString(), quantity: 1 }],
      });

    // Waiter punches Pizza on Table 12 via Waiter counter
    const waiterOrderRes = await request(app)
      .post(`/api/v1/public/restaurants/${restaurant.slug}/tables/${table.token}/orders`)
      .send({
        tableId: table._id.toString(),
        source: 'WAITER',
        items: [{ itemId: pizzaItem._id.toString(), quantity: 1 }],
      });

    expect(waiterOrderRes.status).toBe(201);
    expect(waiterOrderRes.body.data.source).toBe('WAITER');
    expect(waiterOrderRes.body.data.diningSessionId.toString()).toBe(session._id.toString());

    // Both orders roll up into S1
    const freshSession = await DiningSession.findById(session._id);
    expect(freshSession?.roundCount).toBe(2);
    expect(freshSession?.subtotal).toBe(60000); // 180 + 420
  });

  it('Flow 10: Concurrent Orders allocate unique monotonic sequence numbers', async () => {
    const hostJoin = await request(app)
      .post(`/api/v1/public/restaurants/${restaurant.slug}/tables/${table.token}/join`)
      .send({ guestName: 'Alice' });
    const session = hostJoin.body.data.diningSession;

    // Fire 5 orders concurrently
    const orderPromises = [1, 2, 3, 4, 5].map((_i) =>
      request(app)
        .post(`/api/v1/public/restaurants/${restaurant.slug}/tables/${table.token}/orders`)
        .send({
          diningSessionId: session._id,
          items: [{ itemId: coffeeItem._id.toString(), quantity: 1 }],
        })
    );

    const responses = await Promise.all(orderPromises);
    const orderNumbers = responses.map((r) => r.body.data.orderNumber);

    // Verify all 5 succeeded with 201
    expect(responses.every((r) => r.status === 201)).toBe(true);

    // Verify all order numbers are unique
    const uniqueNumbers = new Set(orderNumbers);
    expect(uniqueNumbers.size).toBe(5);
  });
});
