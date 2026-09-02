import { Types } from 'mongoose';
import { ICheckoutAttempt, ICartSnapshotItem } from '../models/CheckoutAttempt';
import { checkoutAttemptRepository } from '../repositories/checkoutAttempt.repository';
import { diningSessionRepository } from '../repositories/diningSession.repository';
import { menuItemRepository } from '../repositories/menuItem.repository';
import { categoryRepository } from '../repositories/category.repository';
import { taxRepository } from '../repositories/tax.repository';
import { orderRepository } from '../repositories/order.repository';
import { paymentRepository } from '../repositories/payment.repository';
import { restaurantSettingsRepository } from '../repositories/restaurantSettings.repository';
import { inventoryService } from './inventory.service';
import { PaymentProviderFactory } from '../integrations/payments/PaymentProviderFactory';
import { RazorpayAdapter } from '../integrations/payments/adapters/RazorpayAdapter';
import { getNextOrderNumber } from '../utils/orderCounter';
import { NotificationService } from './notification.service';
import { posIntegrationService } from './posIntegration.service';
import { restaurantStatsService } from './restaurantStats.service';
import { customerService } from './customer.service';
import { normalizeIndianPhoneNumber } from '../utils/phone';
import { calculateRoundOff } from '../utils/rounding.util';

class CustomError extends Error {
  status: number;
  code: string;
  details?: any;
  constructor(code: string, message: string, status: number = 400, details: any = null) {
    super(message);
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

export class CheckoutService {
  /**
   * Creates a persistent CheckoutAttempt for prepaid orders, validating all prices and stock server-side.
   */
  async createPrepaidCheckoutAttempt(params: {
    restaurantId: Types.ObjectId | string;
    tableId?: Types.ObjectId | string;
    diningSessionId?: Types.ObjectId | string;
    guestSessionId?: Types.ObjectId | string;
    idempotencyKey: string;
    items: {
      itemId: string;
      quantity: number;
      selectedAddOns?: { name: string }[];
      specialInstructions?: string;
    }[];
    customerName?: string;
    customerPhone?: string;
    customerNote?: string;
    orderMode?: 'DINE_IN' | 'TAKEAWAY' | 'DELIVERY' | 'COUNTER';
    deliveryAddress?: Record<string, any>;
  }): Promise<{
    checkoutAttempt: ICheckoutAttempt;
    gatewayOrderId?: string;
    razorpayKeyId?: string;
    amount: number;
    currency: string;
  }> {
    const {
      restaurantId,
      tableId,
      diningSessionId,
      guestSessionId,
      idempotencyKey,
      items,
      customerName,
      customerPhone,
      customerNote,
      orderMode = 'DINE_IN',
      deliveryAddress,
    } = params;

    // 1. Idempotency Check
    const existingAttempt = await checkoutAttemptRepository.findByIdempotencyKeyOnly(idempotencyKey);
    if (existingAttempt) {
      const settings = await restaurantSettingsRepository.findByRestaurantId(restaurantId);
      const razorpayKeyId = settings?.paymentConfig?.razorpayConfig?.keyId;
      return {
        checkoutAttempt: existingAttempt,
        gatewayOrderId: existingAttempt.gatewayOrderId,
        razorpayKeyId,
        amount: existingAttempt.total,
        currency: 'INR',
      };
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      throw new CustomError('BAD_REQUEST', 'Cart items are required and must be a non-empty array', 400);
    }

    // 2. Validate Items & Stock Server-Side
    const categories = await categoryRepository.findByRestaurantId(restaurantId);
    const categoryMap = new Map(categories.map((c) => [c._id.toString(), c]));

    const failedItems: any[] = [];
    const validatedItems: ICartSnapshotItem[] = [];

    for (const item of items) {
      const menuItem = await menuItemRepository.findById(item.itemId);
      if (!menuItem || menuItem.restaurantId.toString() !== restaurantId.toString()) {
        failedItems.push({ itemId: item.itemId, name: 'Unknown Item', reason: 'unavailable' });
        continue;
      }

      const catIdStr = (menuItem.categoryId as any)?._id
        ? (menuItem.categoryId as any)._id.toString()
        : menuItem.categoryId.toString();
      const category = categoryMap.get(catIdStr);
      if (!menuItem.isAvailable) {
        failedItems.push({ itemId: item.itemId, name: menuItem.name, reason: 'unavailable' });
        continue;
      }

      if (!category || !category.isActive) {
        failedItems.push({ itemId: item.itemId, name: menuItem.name, reason: 'category_inactive' });
        continue;
      }

      let unitPriceSnapshot = menuItem.price;
      const selectedAddOns: { name: string; priceDelta: number }[] = [];

      if (item.selectedAddOns && Array.isArray(item.selectedAddOns)) {
        for (const selected of item.selectedAddOns) {
          const match = menuItem.addOns?.find((addon) => addon.name === selected.name);
          if (match) {
            unitPriceSnapshot += match.priceDelta;
            selectedAddOns.push({ name: match.name, priceDelta: match.priceDelta });
          }
        }
      }

      const itemSubtotal = unitPriceSnapshot * (item.quantity || 1);
      validatedItems.push({
        menuItemId: menuItem._id,
        nameSnapshot: menuItem.name,
        unitPriceSnapshot,
        quantity: item.quantity || 1,
        selectedAddOns,
        specialInstructions: item.specialInstructions || '',
        itemSubtotal,
        itemTax: 0,
        itemTotal: itemSubtotal,
      });
    }

    if (failedItems.length > 0) {
      throw new CustomError('ITEMS_UNAVAILABLE', 'Some items in your cart are no longer available', 400, failedItems);
    }

    // Decrement stock
    const stockResult = await inventoryService.validateAndDecrementStock(
      new Types.ObjectId(restaurantId),
      validatedItems.map((vi) => ({
        itemId: vi.menuItemId.toString(),
        quantity: vi.quantity,
        name: vi.nameSnapshot,
      }))
    );

    if (!stockResult.success) {
      throw new CustomError('ITEMS_UNAVAILABLE', 'Some items are out of stock', 400, stockResult.failedItems);
    }

    // 3. Compute Totals & Taxes Server-Side
    const subtotal = validatedItems.reduce((sum, vi) => sum + vi.itemSubtotal, 0);
    const activeTaxes = await taxRepository.findActiveByRestaurantId(restaurantId);

    let tax = 0;
    const taxBreakdown: any[] = [];
    const groups = activeTaxes.filter((t) => t.type === 'GROUP');
    const standardTaxes = activeTaxes.filter((t) => t.type === 'TAX');

    for (const group of groups) {
      const subTaxes = standardTaxes.filter((t) => t.groupId?.toString() === group._id.toString());
      if (subTaxes.length === 0) continue;

      let groupAmount = 0;
      let groupPercentage = 0;
      const subTaxesBreakdown = subTaxes.map((st) => {
        const amt = Math.round(subtotal * (st.percentage / 100));
        groupAmount += amt;
        groupPercentage += st.percentage;
        return { name: st.name, percentage: st.percentage, amount: amt };
      });

      tax += groupAmount;
      taxBreakdown.push({
        name: group.name,
        percentage: groupPercentage,
        amount: groupAmount,
        subTaxes: subTaxesBreakdown,
      });
    }

    const standaloneTaxes = standardTaxes.filter((t) => !t.groupId);
    for (const st of standaloneTaxes) {
      const amt = Math.round(subtotal * (st.percentage / 100));
      tax += amt;
      taxBreakdown.push({
        name: st.name,
        percentage: st.percentage,
        amount: amt,
        subTaxes: [],
      });
    }

    const settings = await restaurantSettingsRepository.findByRestaurantId(restaurantId);
    const unroundedTotal = subtotal + tax;
    const { roundedTotal: total, roundOff } = calculateRoundOff(unroundedTotal, settings?.roundingConfig);

    // 4. Resolve or create dining session if dine-in
    let resolvedDiningSessionId = diningSessionId ? new Types.ObjectId(diningSessionId.toString()) : undefined;
    if (orderMode === 'DINE_IN' && tableId && !resolvedDiningSessionId) {
      let activeSession = await diningSessionRepository.findActiveByTableId(tableId);
      if (!activeSession) {
        activeSession = await diningSessionRepository.create({
          restaurantId: new Types.ObjectId(restaurantId.toString()),
          tableId: new Types.ObjectId(tableId.toString()),
          sessionCode: `S-${Math.floor(1000 + Math.random() * 9000)}`,
          joinPin: Math.floor(1000 + Math.random() * 9000).toString(),
          status: 'ACTIVE',
          paymentMode: 'PREPAID',
          roundCount: 0,
          guestCount: 1,
          subtotal: 0,
          tax: 0,
          taxBreakdown: [],
          discount: 0,
          total: 0,
          paidAmount: 0,
          balanceDue: 0,
          openedAt: new Date(),
          lastActivityAt: new Date(),
        });
      }
      resolvedDiningSessionId = activeSession._id;
    }

    // 5. Create Payment Intent with Payment Provider
    const provider = settings?.paymentConfig?.activeProvider || 'RAZORPAY';

    let gatewayOrderId: string | undefined;
    if (provider === 'RAZORPAY') {
      const adapter = PaymentProviderFactory.getAdapter('RAZORPAY');
      const intent = await adapter.createIntent(restaurantId.toString(), total, 'INR', {
        idempotencyKey,
        diningSessionId: resolvedDiningSessionId?.toString(),
      });
      gatewayOrderId = intent.providerReferenceId;
    }

    // 6. Persist CheckoutAttempt Document
    const attempt = await checkoutAttemptRepository.create({
      restaurantId: new Types.ObjectId(restaurantId.toString()),
      tableId: tableId ? new Types.ObjectId(tableId.toString()) : undefined,
      diningSessionId: resolvedDiningSessionId,
      guestSessionId: guestSessionId ? new Types.ObjectId(guestSessionId.toString()) : undefined,
      idempotencyKey,
      customerName,
      customerPhone,
      customerNote,
      orderMode,
      deliveryAddress,
      cartSnapshot: validatedItems,
      subtotal,
      tax,
      taxBreakdown,
      roundOff,
      total,
      status: 'PAYMENT_PENDING',
      gatewayProvider: provider,
      gatewayOrderId,
    });

    const razorpayKeyId = settings?.paymentConfig?.razorpayConfig?.keyId;

    return {
      checkoutAttempt: attempt,
      gatewayOrderId,
      razorpayKeyId,
      amount: total,
      currency: 'INR',
    };
  }

  /**
   * Confirms payment and creates the immutable Order document atomically.
   */
  async confirmPrepaidPayment(
    checkoutAttemptId: Types.ObjectId | string,
    gatewayPaymentId: string,
    gatewaySignature?: string
  ): Promise<any> {
    const existingAttempt = await checkoutAttemptRepository.findById(checkoutAttemptId);
    if (!existingAttempt) {
      throw new CustomError('ATTEMPT_NOT_FOUND', 'Checkout attempt not found', 404);
    }

    // Server-side verification for Razorpay if signature is present or gatewayOrderId exists
    if (existingAttempt.gatewayProvider === 'RAZORPAY') {
      if (gatewaySignature && existingAttempt.gatewayOrderId) {
        const adapter = new RazorpayAdapter();
        const isValid = await adapter.verifyPaymentSignature(
          existingAttempt.restaurantId.toString(),
          existingAttempt.gatewayOrderId,
          gatewayPaymentId,
          gatewaySignature
        );
        if (!isValid) {
          throw new CustomError('PAYMENT_VERIFICATION_FAILED', 'Server-side payment signature verification failed', 400);
        }
      }
    }

    // Atomic lock on CheckoutAttempt to prevent duplicate processing
    const attempt = await checkoutAttemptRepository.lockPending(checkoutAttemptId, gatewayPaymentId);

    if (!attempt) {
      const existing = await checkoutAttemptRepository.findById(checkoutAttemptId);
      if (existing && existing.status === 'ORDER_CREATED' && existing.orderId) {
        const order = await orderRepository.findById(existing.orderId);
        return order;
      }
      throw new CustomError('ATTEMPT_ALREADY_PROCESSED', 'This checkout attempt has already been processed', 409);
    }

    try {
      const orderNumber = await getNextOrderNumber(attempt.restaurantId);

      let roundNumber = 1;
      if (attempt.diningSessionId) {
        const session = await diningSessionRepository.findById(attempt.diningSessionId);
        if (session) {
          session.roundCount += 1;
          session.subtotal += attempt.subtotal;
          session.tax += attempt.tax;
          session.total += attempt.total;
          session.paidAmount += attempt.total;
          session.lastActivityAt = new Date();
          await diningSessionRepository.save(session);
          roundNumber = session.roundCount;
        }
      }

      // Auto-resolve or upsert customer profile if phone is provided
      let resolvedCustomerId: Types.ObjectId | undefined;
      if (attempt.customerPhone && typeof attempt.customerPhone === 'string' && attempt.customerPhone.trim()) {
        try {
          const cleanPhone = normalizeIndianPhoneNumber(attempt.customerPhone);
          const customer = await customerService.findOrCreateCustomer(
            attempt.restaurantId,
            cleanPhone,
            attempt.customerName?.trim()
          );
          resolvedCustomerId = customer._id as Types.ObjectId;
        } catch (err) {
          console.error('Error auto-upserting customer on prepaid order creation:', err);
        }
      }

      // Create Immutable Order Ticket
      const order = await orderRepository.create({
        restaurantId: attempt.restaurantId,
        tableId: attempt.tableId,
        diningSessionId: attempt.diningSessionId,
        guestSessionId: attempt.guestSessionId,
        customerId: resolvedCustomerId,
        orderNumber,
        roundNumber,
        orderMode: attempt.orderMode,
        deliveryAddress: attempt.deliveryAddress,
        items: attempt.cartSnapshot.map((cs) => ({
          menuItemId: cs.menuItemId,
          nameSnapshot: cs.nameSnapshot,
          unitPriceSnapshot: cs.unitPriceSnapshot,
          quantity: cs.quantity,
          selectedAddOns: cs.selectedAddOns,
          specialInstructions: cs.specialInstructions,
          itemSubtotal: cs.itemSubtotal,
          itemTax: cs.itemTax,
          itemTotal: cs.itemTotal,
          itemStatus: 'PENDING',
        })),
        subtotal: attempt.subtotal,
        tax: attempt.tax,
        taxBreakdown: attempt.taxBreakdown,
        roundOff: attempt.roundOff || 0,
        total: attempt.total,
        customerNote: attempt.customerNote,
        customerName: attempt.customerName,
        customerPhone: attempt.customerPhone,
        status: 'PENDING',
        source: 'QR',
        paymentStatus: 'PAID',
        integrationMetadata: {
          checkoutAttemptId: attempt._id.toString(),
          gatewayPaymentId,
        },
      });

      await restaurantStatsService.recordOrderCreated(attempt.restaurantId);

      if (resolvedCustomerId) {
        customerService.recordCustomerOrder(resolvedCustomerId, attempt.total);
      }

      // Create Payment Transaction Record
      await paymentRepository.create({
        restaurantId: attempt.restaurantId,
        diningSessionId: attempt.diningSessionId,
        checkoutAttemptId: attempt._id,
        orderId: order._id,
        provider: attempt.gatewayProvider,
        method: 'UPI',
        amount: attempt.total,
        currency: 'INR',
        status: 'CAPTURED',
        providerReferenceId: gatewayPaymentId,
      });

      // Finalize CheckoutAttempt
      attempt.status = 'ORDER_CREATED';
      attempt.orderId = order._id;
      await checkoutAttemptRepository.save(attempt);

      // Dispatch to POS & Sockets
      posIntegrationService.pushOrderAsync(attempt.restaurantId, order);

      try {
        NotificationService.getInstance().notifyOrderCreated(attempt.restaurantId.toString(), order);
        if (attempt.diningSessionId) {
          const freshSession = await diningSessionRepository.findById(attempt.diningSessionId);
          NotificationService.getInstance().notifySessionUpdated(
            attempt.restaurantId.toString(),
            attempt.diningSessionId.toString(),
            freshSession
          );
        }
      } catch (e) {
        console.error('Failed to notify order created via socket:', e);
      }

      return order;
    } catch (err: any) {
      console.error('Error creating order after payment success:', err);
      attempt.status = 'RECONCILIATION_REQUIRED';
      attempt.errorMessage = err.message || 'Order creation failed';
      await checkoutAttemptRepository.save(attempt);
      throw err;
    }
  }
}

export const checkoutService = new CheckoutService();
export default checkoutService;
