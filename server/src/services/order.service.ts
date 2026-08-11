import { Types } from 'mongoose';
import { Order, IOrder, OrderStatus, OrderMode } from '../models/Order';
import { DiningSession } from '../models/DiningSession';
import { MenuItem } from '../models/MenuItem';
import { Category } from '../models/Category';
import { Tax } from '../models/Tax';
import { RestaurantSettings } from '../models/RestaurantSettings';
import { inventoryService } from './inventory.service';
import { getNextOrderNumber } from '../utils/orderCounter';
import { validateStatusTransition } from '../utils/orderStateMachine';
import { NotificationService } from './notification.service';
import { posIntegrationService } from './posIntegration.service';
import { restaurantStatsService } from './restaurantStats.service';
import { AuditLog } from '../models/AuditLog';

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

export class OrderService {
  /**
   * Places an immutable Order ticket under an active DiningSession.
   */
  async createOrder(params: {
    restaurantId: Types.ObjectId | string;
    tableId?: Types.ObjectId | string;
    diningSessionId?: Types.ObjectId | string;
    guestSessionId?: Types.ObjectId | string;
    orderMode?: OrderMode;
    items: {
      itemId: string;
      quantity: number;
      selectedAddOns?: { name: string }[];
      specialInstructions?: string;
    }[];
    customerNote?: string;
    customerName?: string;
    customerPhone?: string;
    source?: 'QR' | 'POS' | 'WAITER' | 'MANUAL';
    paymentStatus?: 'PENDING' | 'PAID' | 'WAIVED';
    deliveryAddress?: Record<string, any>;
  }): Promise<IOrder> {
    const {
      restaurantId,
      tableId,
      diningSessionId,
      guestSessionId,
      orderMode = 'DINE_IN',
      items,
      customerNote,
      customerName,
      customerPhone,
      source = 'QR',
      paymentStatus = 'PENDING',
      deliveryAddress,
    } = params;

    if (!items || !Array.isArray(items) || items.length === 0) {
      throw new CustomError('BAD_REQUEST', 'Order items are required and must be a non-empty array', 400);
    }

    // 1. Validate Menu Items & Categories
    const categories = await Category.find({ restaurantId: new Types.ObjectId(restaurantId) });
    const categoryMap = new Map(categories.map((c) => [c._id.toString(), c]));

    const failedItems: any[] = [];
    const validatedItems = [];

    for (const item of items) {
      const menuItem = await MenuItem.findById(item.itemId);
      if (!menuItem || menuItem.restaurantId.toString() !== restaurantId.toString()) {
        failedItems.push({ itemId: item.itemId, name: 'Unknown Item', reason: 'unavailable' });
        continue;
      }

      const category = categoryMap.get(menuItem.categoryId.toString());
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
        prepTimeMinutesSnapshot: menuItem.prepTimeMinutes,
        itemSubtotal,
        itemTax: 0,
        itemTotal: itemSubtotal,
        itemStatus: 'PENDING' as const,
      });
    }

    if (failedItems.length > 0) {
      throw new CustomError('ITEMS_UNAVAILABLE', 'Some items in your cart are unavailable', 400, failedItems);
    }

    // 2. Atomic Stock Decrement
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

    // 3. Compute Totals and Taxes Server-Side
    const subtotal = validatedItems.reduce((sum, item) => sum + item.itemSubtotal, 0);
    const activeTaxes: any[] = await Tax.find({ restaurantId: new Types.ObjectId(restaurantId), isActive: true });

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

    const total = subtotal + tax;

    // 4. Resolve or create DiningSession for Dine-In orders
    let resolvedDiningSession: any = null;
    let roundNumber = 1;

    if (orderMode === 'DINE_IN' && tableId) {
      if (diningSessionId) {
        const existingSession = await DiningSession.findOne({
          _id: new Types.ObjectId(diningSessionId),
          restaurantId: new Types.ObjectId(restaurantId),
        });

        if (existingSession) {
          if (existingSession.status === 'BILL_REQUESTED') {
            throw new CustomError(
              'SESSION_BILL_REQUESTED',
              'A bill has already been requested for this session. Please reopen the session to order more items.',
              409
            );
          }
          if (['SETTLED', 'CLOSED', 'ABANDONED'].includes(existingSession.status)) {
            throw new CustomError(
              'SESSION_NOT_ACTIVE',
              'This dining session has already been settled or closed.',
              409
            );
          }
          resolvedDiningSession = existingSession;
        }
      }

      if (!resolvedDiningSession) {
        const tableActiveSession = await DiningSession.findOne({
          restaurantId: new Types.ObjectId(restaurantId),
          tableId: new Types.ObjectId(tableId),
          status: { $in: ['ACTIVE', 'BILL_REQUESTED'] },
        });

        if (tableActiveSession) {
          if (tableActiveSession.status === 'BILL_REQUESTED') {
            throw new CustomError(
              'SESSION_BILL_REQUESTED',
              'A bill has already been requested for this table. Please reopen the session to order more items.',
              409
            );
          }
          resolvedDiningSession = tableActiveSession;
        }
      }

      if (!resolvedDiningSession) {
        resolvedDiningSession = new DiningSession({
          restaurantId: new Types.ObjectId(restaurantId),
          tableId: new Types.ObjectId(tableId),
          sessionCode: `S-${Math.floor(1000 + Math.random() * 9000)}`,
          joinPin: Math.floor(1000 + Math.random() * 9000).toString(),
          status: 'ACTIVE',
          paymentMode: 'POSTPAID',
          roundCount: 1,
          guestCount: 1,
          subtotal,
          tax,
          taxBreakdown: [],
          discount: 0,
          serviceCharge: 0,
          total,
          paidAmount: 0,
          balanceDue: total,
          openedAt: new Date(),
          lastActivityAt: new Date(),
        });
        await resolvedDiningSession.save();
        roundNumber = 1;
      } else {
        const updatedSession = await DiningSession.findByIdAndUpdate(
          resolvedDiningSession._id,
          {
            $inc: {
              roundCount: 1,
              subtotal,
              tax,
              total,
              balanceDue: total,
            },
            $set: {
              lastActivityAt: new Date(),
            },
          },
          { new: true }
        );
        if (updatedSession) {
          resolvedDiningSession = updatedSession;
        }
        roundNumber = resolvedDiningSession.roundCount;
      }
    }

    // 5. Allocate Monotonically Increasing Order Number
    const orderNumber = await getNextOrderNumber(new Types.ObjectId(restaurantId));

    // 6. Create Immutable Order Ticket
    const order = new Order({
      restaurantId: new Types.ObjectId(restaurantId),
      tableId: tableId ? new Types.ObjectId(tableId) : undefined,
      diningSessionId: resolvedDiningSession ? resolvedDiningSession._id : undefined,
      guestSessionId: guestSessionId ? new Types.ObjectId(guestSessionId) : undefined,
      orderMode,
      deliveryAddress,
      roundNumber,
      orderNumber,
      items: validatedItems,
      subtotal,
      tax,
      taxBreakdown,
      total,
      customerNote: customerNote || '',
      customerName: customerName ? customerName.trim() : undefined,
      customerPhone: customerPhone ? customerPhone.trim() : undefined,
      status: 'PENDING',
      source,
      paymentStatus,
      integrationMetadata: {},
    });

    await order.save();
    await restaurantStatsService.recordOrderCreated(new Types.ObjectId(restaurantId));

    // 7. Dispatch to POS & Notification
    posIntegrationService.pushOrderAsync(new Types.ObjectId(restaurantId), order);

    try {
      NotificationService.getInstance().notifyOrderCreated(restaurantId.toString(), order);
      if (resolvedDiningSession) {
        NotificationService.getInstance().notifySessionUpdated(
          restaurantId.toString(),
          resolvedDiningSession._id.toString(),
          resolvedDiningSession
        );
      }
    } catch (err) {
      console.error('Failed to notify order created via socket:', err);
    }

    // 8. Auto-Accept Workflow Trigger
    const settings = await RestaurantSettings.findOne({ restaurantId });
    const autoAcceptConfig = settings?.workflow?.autoAcceptConfig || { enabled: false, delaySeconds: 10 };
    const workflowMode = settings?.workflow?.orderWorkflowMode || 'FIVE_STEP';

    if (autoAcceptConfig.enabled) {
      const delayMs = (autoAcceptConfig.delaySeconds || 10) * 1000;
      const orderIdStr = order._id.toString();
      const restIdStr = restaurantId.toString();

      setTimeout(async () => {
        try {
          const freshOrder = await Order.findById(orderIdStr);
          if (!freshOrder || freshOrder.status !== 'PENDING') return;

          const nextStatus = workflowMode === 'FIVE_STEP' ? 'ACCEPTED' : 'PREPARING';
          freshOrder.status = nextStatus as any;
          await freshOrder.save();

          NotificationService.getInstance().notifyOrderStatusUpdated(
            restIdStr,
            orderIdStr,
            nextStatus,
            freshOrder.updatedAt
          );
        } catch (e) {
          console.error('[AutoAccept] Failed to auto-accept order:', e);
        }
      }, delayMs);
    }

    return order;
  }

  /**
   * Advances order status through the workflow state machine.
   */
  async updateOrderStatus(
    restaurantId: Types.ObjectId | string,
    orderId: Types.ObjectId | string,
    nextStatus: OrderStatus,
    userRole: 'SUPER_ADMIN' | 'MANAGER' | 'STAFF'
  ): Promise<IOrder> {
    const order = await Order.findOne({
      _id: new Types.ObjectId(orderId),
      restaurantId: new Types.ObjectId(restaurantId),
    });

    if (!order) {
      throw new CustomError('ORDER_NOT_FOUND', 'Order not found', 404);
    }

    const settings = await RestaurantSettings.findOne({ restaurantId });
    const workflowMode = settings?.workflow?.orderWorkflowMode || 'FIVE_STEP';

    const validation = validateStatusTransition(order.status, nextStatus, userRole, workflowMode);
    if (!validation.isValid) {
      throw new CustomError(validation.errorCode || 'INVALID_TRANSITION', validation.errorMessage || 'Invalid status transition', 400);
    }

    order.status = nextStatus;
    await order.save();

    posIntegrationService.updateOrderStatusAsync(restaurantId.toString(), orderId.toString(), order.status);

    try {
      NotificationService.getInstance().notifyOrderStatusUpdated(
        restaurantId.toString(),
        order._id.toString(),
        order.status,
        order.updatedAt
      );

      if (order.diningSessionId) {
        const session = await DiningSession.findById(order.diningSessionId);
        if (session) {
          NotificationService.getInstance().notifySessionUpdated(
            restaurantId.toString(),
            session._id.toString(),
            session
          );
        }
      }
    } catch (err) {
      console.error('Failed to notify order status update:', err);
    }

    return order;
  }

  /**
   * Cancels an order and updates dining session financials.
   */
  async cancelOrder(
    restaurantId: Types.ObjectId | string,
    orderId: Types.ObjectId | string,
    staffUserId?: string,
    reason?: string
  ): Promise<IOrder> {
    const order = await Order.findOne({
      _id: new Types.ObjectId(orderId),
      restaurantId: new Types.ObjectId(restaurantId),
    });

    if (!order) {
      throw new CustomError('ORDER_NOT_FOUND', 'Order not found', 404);
    }

    if (order.status === 'SERVED' || order.status === 'CANCELLED') {
      throw new CustomError('CANNOT_CANCEL', `Cannot cancel an order that is already ${order.status}`, 400);
    }

    order.status = 'CANCELLED';
    await order.save();

    // Recalculate session totals if dine-in
    if (order.diningSessionId) {
      const session = await DiningSession.findById(order.diningSessionId);
      if (session) {
        session.subtotal = Math.max(0, session.subtotal - order.subtotal);
        session.tax = Math.max(0, session.tax - order.tax);
        session.total = Math.max(0, session.total - order.total);
        session.balanceDue = Math.max(0, session.total - session.paidAmount);
        session.lastActivityAt = new Date();
        await session.save();

        try {
          NotificationService.getInstance().notifySessionUpdated(
            restaurantId.toString(),
            session._id.toString(),
            session
          );
        } catch (e) {
          console.error('Failed to notify session update after cancel:', e);
        }
      }
    }

    await AuditLog.create({
      action: 'ORDER_CANCELLED',
      actorId: staffUserId,
      actorRole: 'MANAGER',
      restaurantId: restaurantId.toString(),
      entityType: 'Order',
      entityId: order._id,
      details: { orderNumber: order.orderNumber, reason, amount: order.total },
    });

    try {
      NotificationService.getInstance().notifyOrderStatusUpdated(
        restaurantId.toString(),
        order._id.toString(),
        'CANCELLED',
        order.updatedAt
      );
    } catch (e) {
      console.error('Failed to notify order cancelled:', e);
    }

    return order;
  }
}

export const orderService = new OrderService();
export default orderService;
