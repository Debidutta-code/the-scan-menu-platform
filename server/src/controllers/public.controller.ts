import { Tax } from '../models/Tax';
import { Request, Response, NextFunction } from 'express';
import { Restaurant } from '../models/Restaurant';
import { RestaurantSettings } from '../models/RestaurantSettings';
import { Table } from '../models/Table';
import { Category } from '../models/Category';
import { MenuItem } from '../models/MenuItem';
import { Order, OrderCounter } from '../models/Order';
import { TableSession } from '../models/TableSession';
import { sendSuccess, sendError } from '../utils/response';
import { NotificationService } from '../services/notification.service';
import { restaurantStatsService } from '../services/restaurantStats.service';
import { paymentService } from '../services/payment.service';
import { posIntegrationService } from '../services/posIntegration.service';
import { inventoryService } from '../services/inventory.service';
import mongoose from 'mongoose';

export class PublicController {
  constructor() {
    this.resolveTable = this.resolveTable.bind(this);
    this.getMenu = this.getMenu.bind(this);
    this.getSessionlessMenu = this.getSessionlessMenu.bind(this);
    this.createOrder = this.createOrder.bind(this);
    this.createSessionlessOrder = this.createSessionlessOrder.bind(this);
    this.createPaymentIntent = this.createPaymentIntent.bind(this);
    this.getOrder = this.getOrder.bind(this);
    this.getOrderStatus = this.getOrderStatus.bind(this);
    this.getTableSession = this.getTableSession.bind(this);
    this.getTaxes = this.getTaxes.bind(this);
    this.clearTableSession = this.clearTableSession.bind(this);
  }

  async clearTableSession(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { restaurantSlug, tableToken } = req.params;

      if (!restaurantSlug || !tableToken) {
        sendError(res, 'TABLE_NOT_FOUND', 'The specified table or restaurant was not found', null, 404);
        return;
      }

      const restaurant = await Restaurant.findOne({ slug: restaurantSlug.toLowerCase().trim() });
      if (!restaurant || restaurant.status === 'SUSPENDED' || restaurant.status === 'ARCHIVED' || restaurant.status === 'EXPIRED') {
        sendError(res, 'TABLE_NOT_FOUND', 'The specified table or restaurant was not found', null, 404);
        return;
      }

      const table = await Table.findOne({ token: tableToken, restaurantId: restaurant.id });
      if (!table || !table.isActive) {
        sendError(res, 'TABLE_NOT_FOUND', 'The specified table or restaurant was not found', null, 404);
        return;
      }

      const activeSession = await TableSession.findOne({
        restaurantId: restaurant._id,
        tableId: table._id,
        status: 'OPEN',
      });

      if (activeSession) {
        activeSession.status = 'CLOSED';
        activeSession.closedAt = new Date();
        await activeSession.save();

        try {
          NotificationService.getInstance().notifySessionUpdated(
            restaurant._id.toString(),
            activeSession._id.toString(),
            activeSession
          );
        } catch (err) {
          console.error('Failed to notify session update:', err);
        }
      }

      sendSuccess(res, { success: true }, 'Table session cleared successfully');
    } catch (error) {
      next(error);
    }
  }

  async resolveTable(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { restaurantSlug, tableToken } = req.params;

      if (!restaurantSlug || !tableToken) {
        sendError(res, 'TABLE_NOT_FOUND', 'The specified table or restaurant was not found', null, 404);
        return;
      }

      const restaurant = await Restaurant.findOne({ slug: restaurantSlug.toLowerCase().trim() });
      if (!restaurant || restaurant.status === 'SUSPENDED' || restaurant.status === 'ARCHIVED' || restaurant.status === 'EXPIRED') {
        sendError(res, 'TABLE_NOT_FOUND', 'The specified table or restaurant was not found', null, 404);
        return;
      }

      const table = await Table.findOne({ token: tableToken, restaurantId: restaurant.id });
      if (!table || !table.isActive) {
        sendError(res, 'TABLE_NOT_FOUND', 'The specified table or restaurant was not found', null, 404);
        return;
      }

      const settings = await RestaurantSettings.findOne({ restaurantId: restaurant._id });

      const activeSession = await TableSession.findOne({
        restaurantId: restaurant._id,
        tableId: table._id,
        status: 'OPEN',
      });

      const responseData = {
        restaurant: {
          id: restaurant.id,
          name: restaurant.name,
          slug: restaurant.slug,
          code: restaurant.code,
          status: restaurant.status,
          logoUrl: settings?.branding?.logoUrl || restaurant.logoUrl,
          coverImageUrl: settings?.branding?.coverImageUrl || restaurant.coverImageUrl,
          description: restaurant.description,
          googleReviewUrl: settings?.branding?.googleReviewUrl,
          theme: settings?.theme || { primaryColor: '#111827', secondaryColor: '#FFFFFF', accentColor: '#F59E0B', fontFamily: 'Plus Jakarta Sans' },
          currency: settings?.currency || 'INR',
          timezone: settings?.timezone || 'Asia/Kolkata',
          taxRatePercent: settings?.paymentConfig?.taxRatePercent || 0,
          orderWorkflowMode: settings?.workflow?.orderWorkflowMode || 'FIVE_STEP',
          autoAcceptConfig: settings?.workflow?.autoAcceptConfig || { enabled: false, delaySeconds: 10 },
        },
        table: {
          id: table.id,
          displayName: table.displayName,
          tableNumber: table.tableNumber,
          token: table.token,
          activeSessionId: activeSession ? activeSession._id : null,
        },
      };

      sendSuccess(res, responseData, 'Table resolved successfully');
    } catch (error) {
      next(error);
    }
  }

  async getMenu(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { restaurantSlug, tableToken } = req.params;

      if (!restaurantSlug || !tableToken) {
        sendError(res, 'TABLE_NOT_FOUND', 'The specified table or restaurant was not found', null, 404);
        return;
      }

      const restaurant = await Restaurant.findOne({ slug: restaurantSlug.toLowerCase().trim() });
      if (!restaurant || restaurant.status === 'SUSPENDED' || restaurant.status === 'ARCHIVED' || restaurant.status === 'EXPIRED') {
        sendError(res, 'TABLE_NOT_FOUND', 'The specified table or restaurant was not found', null, 404);
        return;
      }

      const table = await Table.findOne({ token: tableToken, restaurantId: restaurant.id });
      if (!table || !table.isActive) {
        sendError(res, 'TABLE_NOT_FOUND', 'The specified table or restaurant was not found', null, 404);
        return;
      }

      const categories = await Category.find({
        restaurantId: restaurant._id,
        isActive: true,
      }).sort({ sortOrder: 1 });

      const menuItems = await MenuItem.find({
        restaurantId: restaurant._id,
      }).sort({ sortOrder: 1 });

      const categoriesWithItems = categories.map((category) => {
        const items = menuItems.filter(
          (item) => item.categoryId.toString() === category._id.toString()
        );
        return {
          _id: category._id,
          name: category.name,
          description: category.description,
          imageUrl: category.imageUrl,
          sortOrder: category.sortOrder,
          menuItems: items,
        };
      });

      sendSuccess(res, categoriesWithItems, 'Public menu retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  async createOrder(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { restaurantSlug, tableToken } = req.params;
      const { items, customerNote, customerName, customerPhone, paymentStatus } = req.body;

      if (!restaurantSlug || !tableToken) {
        sendError(res, 'TABLE_NOT_FOUND', 'The specified table or restaurant was not found', null, 404);
        return;
      }

      const restaurant = await Restaurant.findOne({ slug: restaurantSlug.toLowerCase().trim() });
      if (!restaurant || restaurant.status === 'SUSPENDED' || restaurant.status === 'ARCHIVED' || restaurant.status === 'EXPIRED') {
        sendError(res, 'TABLE_NOT_FOUND', 'The specified table or restaurant was not found', null, 404);
        return;
      }

      const table = await Table.findOne({ token: tableToken, restaurantId: restaurant.id });
      if (!table || !table.isActive) {
        sendError(res, 'TABLE_NOT_FOUND', 'The specified table or restaurant was not found', null, 404);
        return;
      }

      const settings = await RestaurantSettings.findOne({ restaurantId: restaurant._id });

      if (!items || !Array.isArray(items) || items.length === 0) {
        sendError(res, 'BAD_REQUEST', 'Order items are required and must be a non-empty array', null, 400);
        return;
      }

      const categories = await Category.find({ restaurantId: restaurant._id });
      const categoryMap = new Map(categories.map((c) => [c._id.toString(), c]));

      const failedItems: { menuItemId: string; name: string; reason: 'unavailable' | 'category_inactive' }[] = [];
      const validatedItems = [];

      for (const item of items) {
        if (!item.itemId) {
          sendError(res, 'BAD_REQUEST', 'Each order item must specify an itemId', null, 400);
          return;
        }

        const menuItem = await MenuItem.findById(item.itemId);
        if (!menuItem || menuItem.restaurantId.toString() !== restaurant._id.toString()) {
          failedItems.push({
            menuItemId: item.itemId,
            name: item.name || 'Unknown Item',
            reason: 'unavailable',
          });
          continue;
        }

        const category = categoryMap.get(menuItem.categoryId.toString());

        if (!menuItem.isAvailable) {
          failedItems.push({
            menuItemId: item.itemId,
            name: menuItem.name,
            reason: 'unavailable',
          });
          continue;
        }

        if (!category || !category.isActive) {
          failedItems.push({
            menuItemId: item.itemId,
            name: menuItem.name,
            reason: 'category_inactive',
          });
          continue;
        }

        let unitPriceSnapshot = menuItem.price;
        const selectedAddOns = [];

        if (item.selectedAddOns && Array.isArray(item.selectedAddOns)) {
          for (const selected of item.selectedAddOns) {
            const match = menuItem.addOns?.find((addon) => addon.name === selected.name);
            if (match) {
              unitPriceSnapshot += match.priceDelta;
              selectedAddOns.push({
                name: match.name,
                priceDelta: match.priceDelta,
              });
            }
          }
        }

        validatedItems.push({
          menuItemId: menuItem._id,
          nameSnapshot: menuItem.name,
          unitPriceSnapshot,
          quantity: item.quantity || 1,
          selectedAddOns,
          specialInstructions: item.specialInstructions || '',
          prepTimeMinutesSnapshot: menuItem.prepTimeMinutes,
          itemStatus: 'PENDING',
        });
      }

      if (failedItems.length > 0) {
        sendError(
          res,
          'ITEMS_UNAVAILABLE',
          'Some items in your basket are currently unavailable.',
          failedItems,
          400
        );
        return;
      }

      const stockResult = await inventoryService.validateAndDecrementStock(
        restaurant._id,
        validatedItems.map((vi) => ({
          itemId: vi.menuItemId.toString(),
          quantity: vi.quantity,
          name: vi.nameSnapshot,
        }))
      );

      if (!stockResult.success) {
        sendError(
          res,
          'ITEMS_UNAVAILABLE',
          'Some items in your basket are currently unavailable.',
          stockResult.failedItems || [],
          400
        );
        return;
      }

      const subtotal = validatedItems.reduce((sum, item) => sum + item.unitPriceSnapshot * item.quantity, 0);

      const activeTaxes: any[] = await Tax.find({ restaurantId: restaurant._id, isActive: true });

      let tax = 0;
      const taxBreakdown: any[] = [];
      const groups = activeTaxes.filter(t => t.type === 'GROUP');
      const standardTaxes = activeTaxes.filter(t => t.type === 'TAX');

      for (const group of groups) {
        const subTaxes = standardTaxes.filter(t => t.groupId?.toString() === group._id.toString());
        if (subTaxes.length === 0) continue;

        let groupAmount = 0;
        let groupPercentage = 0;
        const subTaxesBreakdown = subTaxes.map(st => {
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

      const standaloneTaxes = standardTaxes.filter(t => !t.groupId);
      for (const st of standaloneTaxes) {
        const amount = Math.round(subtotal * (st.percentage / 100));
        tax += amount;
        taxBreakdown.push({
          name: st.name,
          percentage: st.percentage,
          amount,
          subTaxes: [],
        });
      }

      const total = subtotal + tax;

      let session = await TableSession.findOne({
        restaurantId: restaurant._id,
        tableId: table._id,
        status: 'OPEN',
      });

      let isNewSession = false;
      if (!session) {
        isNewSession = true;
        session = new TableSession({
          restaurantId: restaurant._id,
          tableId: table._id,
          status: 'OPEN',
          roundCount: 1,
          subtotal: 0,
          tax: 0,
          total: 0,
          openedAt: new Date(),
        });
        await session.save();
      }

      let order: any;
      let isMerge = false;

      if (!isNewSession) {
        const mostRecentOrder = await Order.findOne({ sessionId: session._id }).sort({ createdAt: -1 });
        if (mostRecentOrder && mostRecentOrder.status === 'PENDING') {
          isMerge = true;
          order = mostRecentOrder;

          order.items.push(...validatedItems);

          order.subtotal = order.items.reduce((sum: number, item: any) => sum + item.unitPriceSnapshot * item.quantity, 0);

          let mergedTax = 0;
          const mergedTaxBreakdown: any[] = [];
          const groups = activeTaxes.filter(t => t.type === 'GROUP');
          const standardTaxes = activeTaxes.filter(t => t.type === 'TAX');

          for (const group of groups) {
            const subTaxes = standardTaxes.filter(t => t.groupId?.toString() === group._id.toString());
            if (subTaxes.length === 0) continue;

            let groupAmount = 0;
            let groupPercentage = 0;
            const subTaxesBreakdown = subTaxes.map(st => {
              const amt = Math.round(order.subtotal * (st.percentage / 100));
              groupAmount += amt;
              groupPercentage += st.percentage;
              return { name: st.name, percentage: st.percentage, amount: amt };
            });

            mergedTax += groupAmount;
            mergedTaxBreakdown.push({
              name: group.name,
              percentage: groupPercentage,
              amount: groupAmount,
              subTaxes: subTaxesBreakdown,
            });
          }

          const standaloneTaxes = standardTaxes.filter(t => !t.groupId);
          for (const st of standaloneTaxes) {
            const amount = Math.round(order.subtotal * (st.percentage / 100));
            mergedTax += amount;
            mergedTaxBreakdown.push({
              name: st.name,
              percentage: st.percentage,
              amount,
              subTaxes: [],
            });
          }

          order.taxBreakdown = mergedTaxBreakdown;
          order.tax = mergedTax;
          order.total = order.subtotal + order.tax;
          order.isMerged = true;
          if (customerNote) {
            order.customerNote = order.customerNote ? `${order.customerNote}\n${customerNote}` : customerNote;
          }

          await order.save();
        }
      }

      if (!isMerge) {
        if (!isNewSession) {
          session.roundCount += 1;
          await session.save();
        }

        const counter = await OrderCounter.findOneAndUpdate(
          { restaurantId: restaurant._id },
          { $inc: { seq: 1 } },
          { upsert: true, new: true }
        );
        const orderNumber = counter.seq;

        order = new Order({
          restaurantId: restaurant._id,
          tableId: table._id,
          sessionId: session._id,
          orderMode: 'DINE_IN',
          roundNumber: session.roundCount,
          isMerged: false,
          orderNumber,
          items: validatedItems,
          subtotal,
          tax,
          taxBreakdown,
          total,
          customerNote: customerNote || '',
          status: 'PENDING',
          source: 'QR',
          customerName: customerName || undefined,
          customerPhone: customerPhone || undefined,
          paymentStatus: paymentStatus || 'PENDING',
          integrationMetadata: {},
        });

        await order.save();
        await restaurantStatsService.recordOrderCreated(restaurant._id);
      }

      const allOrdersInSession = await Order.find({ sessionId: session._id });
      session.subtotal = allOrdersInSession.reduce((sum: number, o: any) => sum + o.subtotal, 0);
      session.tax = allOrdersInSession.reduce((sum: number, o: any) => sum + o.tax, 0);
      session.total = allOrdersInSession.reduce((sum: number, o: any) => sum + o.total, 0);
      await session.save();

      posIntegrationService.pushOrderAsync(restaurant._id, order);

      try {
        if (isMerge) {
          NotificationService.getInstance().notifyOrderStatusUpdated(
            order.restaurantId.toString(),
            order._id.toString(),
            order.status,
            order.updatedAt
          );
        } else {
          const orderSummary = {
            _id: order._id,
            restaurantId: order.restaurantId,
            tableId: {
              _id: table._id,
              displayName: table.displayName,
              tableNumber: table.tableNumber,
            },
            sessionId: order.sessionId,
            roundNumber: order.roundNumber,
            isMerged: order.isMerged,
            orderNumber: order.orderNumber,
            items: order.items,
            subtotal: order.subtotal,
            tax: order.tax,
            taxBreakdown: order.taxBreakdown,
            total: order.total,
            customerNote: order.customerNote,
            status: order.status,
            source: order.source,
            createdAt: order.createdAt,
          };
          NotificationService.getInstance().notifyOrderCreated(order.restaurantId.toString(), orderSummary);
        }

        NotificationService.getInstance().notifySessionUpdated(restaurant._id.toString(), session._id.toString(), session);
      } catch (err) {
        console.error('Failed to notify order changes:', err);
      }

      sendSuccess(res, order, isMerge ? 'Order merged into pending round' : 'Order placed successfully', isMerge ? 200 : 201);

      const autoAcceptConfig = settings?.workflow?.autoAcceptConfig || { enabled: false, delaySeconds: 10 };
      const workflowMode = settings?.workflow?.orderWorkflowMode || 'FIVE_STEP';

      if (!isMerge && autoAcceptConfig.enabled) {
        const delayMs = (autoAcceptConfig.delaySeconds || 10) * 1000;
        const orderId = order._id.toString();
        const restaurantIdStr = restaurant._id.toString();

        setTimeout(async () => {
          try {
            const freshOrder = await Order.findById(orderId);
            if (!freshOrder || freshOrder.status !== 'PENDING') return;

            const nextStatus = workflowMode === 'FIVE_STEP' ? 'ACCEPTED' : 'PREPARING';
            freshOrder.status = nextStatus as any;
            await freshOrder.save();

            NotificationService.getInstance().notifyOrderStatusUpdated(
              restaurantIdStr,
              orderId,
              nextStatus,
              freshOrder.updatedAt
            );
          } catch (err) {
            console.error('[AutoAccept] Failed to auto-accept order:', err);
          }
        }, delayMs);
      }
    } catch (error) {
      next(error);
    }
  }

  async getOrder(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { orderId } = req.params;

      if (!mongoose.Types.ObjectId.isValid(orderId)) {
        sendError(res, 'ORDER_NOT_FOUND', 'Order not found', null, 404);
        return;
      }

      const order = await Order.findById(orderId);
      if (!order) {
        sendError(res, 'ORDER_NOT_FOUND', 'Order not found', null, 404);
        return;
      }

      sendSuccess(res, order, 'Order retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  async getOrderStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { orderId } = req.params;

      if (!mongoose.Types.ObjectId.isValid(orderId)) {
        sendError(res, 'ORDER_NOT_FOUND', 'Order not found', null, 404);
        return;
      }

      const order = await Order.findById(orderId).select('status');
      if (!order) {
        sendError(res, 'ORDER_NOT_FOUND', 'Order not found', null, 404);
        return;
      }

      sendSuccess(res, { status: order.status }, 'Order status retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  async getTaxes(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { restaurantId } = req.params;

      if (!mongoose.Types.ObjectId.isValid(restaurantId)) {
        sendError(res, 'RESTAURANT_NOT_FOUND', 'Restaurant not found', null, 404);
        return;
      }

      const activeTaxes = await Tax.find({ restaurantId, isActive: true });
      sendSuccess(res, activeTaxes, 'Taxes retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  async getTableSession(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { sessionId } = req.params;

      if (!mongoose.Types.ObjectId.isValid(sessionId)) {
        sendError(res, 'SESSION_NOT_FOUND', 'Session not found', null, 404);
        return;
      }

      const session = await TableSession.findById(sessionId);
      if (!session) {
        sendError(res, 'SESSION_NOT_FOUND', 'Session not found', null, 404);
        return;
      }

      const orders = await Order.find({ sessionId: session._id }).sort({ roundNumber: 1 });

      sendSuccess(res, { session, orders }, 'Session retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  async getSessionlessMenu(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { restaurantSlug } = req.params;

      if (!restaurantSlug) {
        sendError(res, 'RESTAURANT_NOT_FOUND', 'Restaurant slug is required', null, 404);
        return;
      }

      const restaurant = await Restaurant.findOne({ slug: restaurantSlug.toLowerCase().trim() });
      if (!restaurant || restaurant.status === 'SUSPENDED' || restaurant.status === 'ARCHIVED' || restaurant.status === 'EXPIRED') {
        sendError(res, 'RESTAURANT_NOT_FOUND', 'Restaurant not found', null, 404);
        return;
      }

      const settings = await RestaurantSettings.findOne({ restaurantId: restaurant._id });

      const categories = await Category.find({
        restaurantId: restaurant._id,
        isActive: true,
      }).sort({ sortOrder: 1 });

      const menuItems = await MenuItem.find({
        restaurantId: restaurant._id,
      }).sort({ sortOrder: 1 });

      const categoriesWithItems = categories.map((category) => {
        const items = menuItems.filter(
          (item) => item.categoryId.toString() === category._id.toString()
        );
        return {
          _id: category._id,
          name: category.name,
          description: category.description,
          imageUrl: category.imageUrl,
          sortOrder: category.sortOrder,
          menuItems: items,
        };
      });

      const responseData = {
        restaurant: {
          id: restaurant.id,
          name: restaurant.name,
          slug: restaurant.slug,
          code: restaurant.code,
          status: restaurant.status,
          logoUrl: settings?.branding?.logoUrl || restaurant.logoUrl,
          coverImageUrl: settings?.branding?.coverImageUrl || restaurant.coverImageUrl,
          description: restaurant.description,
          theme: settings?.theme || { primaryColor: '#111827', secondaryColor: '#FFFFFF', accentColor: '#F59E0B', fontFamily: 'Plus Jakarta Sans' },
          currency: settings?.currency || 'INR',
          timezone: settings?.timezone || 'Asia/Kolkata',
          paymentConfig: settings?.paymentConfig || { activeProvider: 'CASH', activeMode: 'POSTPAID' },
        },
        categories: categoriesWithItems,
      };

      sendSuccess(res, responseData, 'Public menu retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  async createSessionlessOrder(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { restaurantSlug } = req.params;
      const { orderMode, items, customerNote, customerName, customerPhone, deliveryAddress, paymentStatus } = req.body;

      if (!restaurantSlug) {
        sendError(res, 'RESTAURANT_NOT_FOUND', 'Restaurant slug is required', null, 400);
        return;
      }

      if (!orderMode || !['TAKEAWAY', 'DELIVERY'].includes(orderMode)) {
        sendError(res, 'BAD_REQUEST', 'orderMode must be TAKEAWAY or DELIVERY', null, 400);
        return;
      }

      if (!customerName || typeof customerName !== 'string' || customerName.trim() === '') {
        sendError(res, 'BAD_REQUEST', 'Customer name is required', null, 400);
        return;
      }

      if (!customerPhone || typeof customerPhone !== 'string' || customerPhone.trim() === '') {
        sendError(res, 'BAD_REQUEST', 'Customer phone number is required', null, 400);
        return;
      }

      if (orderMode === 'DELIVERY') {
        if (
          !deliveryAddress ||
          (typeof deliveryAddress === 'string' && deliveryAddress.trim() === '') ||
          (typeof deliveryAddress === 'object' && !deliveryAddress.street && !deliveryAddress.fullAddress)
        ) {
          sendError(res, 'BAD_REQUEST', 'Delivery address is required for Delivery orders', null, 400);
          return;
        }
      }

      const restaurant = await Restaurant.findOne({ slug: restaurantSlug.toLowerCase().trim() });
      if (!restaurant || restaurant.status === 'SUSPENDED' || restaurant.status === 'ARCHIVED' || restaurant.status === 'EXPIRED') {
        sendError(res, 'RESTAURANT_NOT_FOUND', 'Restaurant not found', null, 404);
        return;
      }

      if (!items || !Array.isArray(items) || items.length === 0) {
        sendError(res, 'BAD_REQUEST', 'Order items are required and must be a non-empty array', null, 400);
        return;
      }

      const categories = await Category.find({ restaurantId: restaurant._id });
      const categoryMap = new Map(categories.map((c) => [c._id.toString(), c]));

      const failedItems: { menuItemId: string; name: string; reason: 'unavailable' | 'category_inactive' }[] = [];
      const validatedItems = [];

      for (const item of items) {
        if (!item.itemId) {
          sendError(res, 'BAD_REQUEST', 'Each order item must specify an itemId', null, 400);
          return;
        }

        const menuItem = await MenuItem.findById(item.itemId);
        if (!menuItem || menuItem.restaurantId.toString() !== restaurant._id.toString()) {
          failedItems.push({
            menuItemId: item.itemId,
            name: item.name || 'Unknown Item',
            reason: 'unavailable',
          });
          continue;
        }

        const category = categoryMap.get(menuItem.categoryId.toString());

        if (!menuItem.isAvailable) {
          failedItems.push({
            menuItemId: item.itemId,
            name: menuItem.name,
            reason: 'unavailable',
          });
          continue;
        }

        if (!category || !category.isActive) {
          failedItems.push({
            menuItemId: item.itemId,
            name: menuItem.name,
            reason: 'category_inactive',
          });
          continue;
        }

        let unitPriceSnapshot = menuItem.price;
        const selectedAddOns = [];

        if (item.selectedAddOns && Array.isArray(item.selectedAddOns)) {
          for (const selected of item.selectedAddOns) {
            const match = menuItem.addOns?.find((addon) => addon.name === selected.name);
            if (match) {
              unitPriceSnapshot += match.priceDelta;
              selectedAddOns.push({
                name: match.name,
                priceDelta: match.priceDelta,
              });
            }
          }
        }

        validatedItems.push({
          menuItemId: menuItem._id,
          nameSnapshot: menuItem.name,
          unitPriceSnapshot,
          quantity: item.quantity || 1,
          selectedAddOns,
          specialInstructions: item.specialInstructions || '',
          prepTimeMinutesSnapshot: menuItem.prepTimeMinutes,
          itemStatus: 'PENDING',
        });
      }

      if (failedItems.length > 0) {
        sendError(
          res,
          'ITEMS_UNAVAILABLE',
          'Some items in your basket are currently unavailable.',
          failedItems,
          400
        );
        return;
      }

      const stockResult = await inventoryService.validateAndDecrementStock(
        restaurant._id,
        validatedItems.map((vi) => ({
          itemId: vi.menuItemId.toString(),
          quantity: vi.quantity,
          name: vi.nameSnapshot,
        }))
      );

      if (!stockResult.success) {
        sendError(
          res,
          'ITEMS_UNAVAILABLE',
          'Some items in your basket are currently unavailable.',
          stockResult.failedItems || [],
          400
        );
        return;
      }

      const subtotal = validatedItems.reduce((sum, item) => sum + item.unitPriceSnapshot * item.quantity, 0);
      const activeTaxes: any[] = await Tax.find({ restaurantId: restaurant._id, isActive: true });

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
        const amount = Math.round(subtotal * (st.percentage / 100));
        tax += amount;
        taxBreakdown.push({
          name: st.name,
          percentage: st.percentage,
          amount,
          subTaxes: [],
        });
      }

      const total = subtotal + tax;

      const counter = await OrderCounter.findOneAndUpdate(
        { restaurantId: restaurant._id },
        { $inc: { seq: 1 } },
        { upsert: true, new: true }
      );
      const orderNumber = counter.seq;

      const formattedAddress = typeof deliveryAddress === 'string'
        ? { fullAddress: deliveryAddress.trim() }
        : deliveryAddress;

      const order = new Order({
        restaurantId: restaurant._id,
        orderMode,
        deliveryAddress: orderMode === 'DELIVERY' ? formattedAddress : undefined,
        isMerged: false,
        orderNumber,
        items: validatedItems,
        subtotal,
        tax,
        taxBreakdown,
        total,
        customerNote: customerNote || '',
        status: 'PENDING',
        source: 'QR',
        customerName: customerName.trim(),
        customerPhone: customerPhone.trim(),
        paymentStatus: paymentStatus || 'PENDING',
        integrationMetadata: {},
      });

      await order.save();
      await restaurantStatsService.recordOrderCreated(restaurant._id);

      posIntegrationService.pushOrderAsync(restaurant._id, order);

      try {
        const orderSummary = {
          _id: order._id,
          restaurantId: order.restaurantId,
          orderMode: order.orderMode,
          deliveryAddress: order.deliveryAddress,
          orderNumber: order.orderNumber,
          items: order.items,
          subtotal: order.subtotal,
          tax: order.tax,
          taxBreakdown: order.taxBreakdown,
          total: order.total,
          customerNote: order.customerNote,
          status: order.status,
          source: order.source,
          customerName: order.customerName,
          customerPhone: order.customerPhone,
          createdAt: order.createdAt,
        };
        NotificationService.getInstance().notifyOrderCreated(restaurant._id.toString(), orderSummary);
      } catch (err) {
        console.error('Failed to notify order changes:', err);
      }

      sendSuccess(res, order, 'Order placed successfully', 201);
    } catch (error) {
      next(error);
    }
  }

  async createPaymentIntent(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { restaurantSlug } = req.params;
      const { amount, currency, metadata } = req.body;

      if (!amount || amount <= 0) {
        sendError(res, 'BAD_REQUEST', 'Invalid amount', null, 400);
        return;
      }

      const restaurant = await Restaurant.findOne({ slug: restaurantSlug.toLowerCase().trim() });
      if (!restaurant || restaurant.status === 'SUSPENDED' || restaurant.status === 'ARCHIVED' || restaurant.status === 'EXPIRED') {
        sendError(res, 'RESTAURANT_NOT_FOUND', 'Restaurant not found', null, 404);
        return;
      }

      const intent = await paymentService.createIntent(restaurant._id, amount, currency || 'INR', metadata);

      const settings = await RestaurantSettings.findOne({ restaurantId: restaurant._id });
      let razorpayKeyId: string | undefined;
      if (settings?.paymentConfig?.activeProvider === 'RAZORPAY') {
        razorpayKeyId = settings.paymentConfig.razorpayConfig?.keyId;
      }

      sendSuccess(res, { ...intent, razorpayKeyId }, 'Payment intent created successfully', 201);
    } catch (error) {
      next(error);
    }
  }
}
export default PublicController;
