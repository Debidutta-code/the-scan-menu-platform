import { Request, Response, NextFunction } from 'express';
import { TenantRequest } from '../middleware/tenantResolver.middleware';
import { Restaurant } from '../models/Restaurant';
import { RestaurantSettings } from '../models/RestaurantSettings';
import { Table } from '../models/Table';
import { Category } from '../models/Category';
import { MenuItem } from '../models/MenuItem';
import { Order } from '../models/Order';
import { DiningSession } from '../models/DiningSession';
import { Bill } from '../models/Bill';
import { Tax } from '../models/Tax';
import { diningSessionService } from '../services/diningSession.service';
import { orderService } from '../services/order.service';
import { checkoutService } from '../services/checkout.service';
import { billService } from '../services/bill.service';
import { sendSuccess, sendError } from '../utils/response';
import { cacheService } from '../utils/cacheService';
import mongoose from 'mongoose';

export class PublicController {
  constructor() {
    this.resolveTable = this.resolveTable.bind(this);
    this.joinSession = this.joinSession.bind(this);
    this.getMenu = this.getMenu.bind(this);
    this.getSessionlessMenu = this.getSessionlessMenu.bind(this);
    this.createOrder = this.createOrder.bind(this);
    this.createSessionlessOrder = this.createSessionlessOrder.bind(this);
    this.createPrepaidCheckout = this.createPrepaidCheckout.bind(this);
    this.confirmPrepaidPayment = this.confirmPrepaidPayment.bind(this);
    this.requestBill = this.requestBill.bind(this);
    this.reopenSession = this.reopenSession.bind(this);
    this.getOrder = this.getOrder.bind(this);
    this.getOrderStatus = this.getOrderStatus.bind(this);
    this.getTableSession = this.getTableSession.bind(this);
    this.getTaxes = this.getTaxes.bind(this);
    this.clearTableSession = this.clearTableSession.bind(this);
  }

  async resolveTable(req: TenantRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { restaurantSlug, tableToken } = req.params;
      const guestToken = req.headers['x-guest-token'] as string || req.query.guestToken as string;

      const restaurantIdentifier = req.restaurant ? req.restaurant.slug : (restaurantSlug || (req.restaurant as any)?._id?.toString());
      const token = tableToken || req.table?.token;

      if (!token) {
        sendError(res, 'TABLE_NOT_FOUND', 'Table token is missing', null, 400);
        return;
      }

      const resolution = await diningSessionService.resolveTable(restaurantIdentifier, token, guestToken);
      const settings = await RestaurantSettings.findOne({ restaurantId: resolution.restaurant._id });

      const responseData = {
        restaurant: {
          id: resolution.restaurant.id,
          name: resolution.restaurant.name,
          slug: resolution.restaurant.slug,
          code: resolution.restaurant.code,
          status: resolution.restaurant.status,
          logoUrl: settings?.branding?.logoUrl || resolution.restaurant.logoUrl,
          coverImageUrl: settings?.branding?.coverImageUrl || resolution.restaurant.coverImageUrl,
          description: resolution.restaurant.description,
          googleReviewUrl: settings?.branding?.googleReviewUrl,
          theme: settings?.theme || { primaryColor: '#111827', secondaryColor: '#FFFFFF', accentColor: '#F59E0B', fontFamily: 'Plus Jakarta Sans' },
          currency: settings?.currency || 'INR',
          timezone: settings?.timezone || 'Asia/Kolkata',
          taxRatePercent: settings?.paymentConfig?.taxRatePercent || 0,
          paymentConfig: settings?.paymentConfig || { activeProvider: 'CASH', activeMode: 'POSTPAID' },
          orderWorkflowMode: settings?.workflow?.orderWorkflowMode || 'FIVE_STEP',
          autoAcceptConfig: settings?.workflow?.autoAcceptConfig || { enabled: false, delaySeconds: 10 },
        },
        table: {
          id: resolution.table.id,
          displayName: resolution.table.displayName,
          tableNumber: resolution.table.tableNumber,
          token: resolution.table.token,
          activeSessionId: resolution.session ? resolution.session._id : (resolution.activeSessionSummary?.sessionId || null),
        },
        session: resolution.session,
        guestSession: resolution.guestSession,
        isParticipant: resolution.isParticipant,
        hasOngoingMeal: resolution.hasOngoingMeal,
        activeSessionSummary: resolution.activeSessionSummary,
        status: resolution.status,
      };

      sendSuccess(res, responseData, 'Table resolved successfully');
    } catch (error: any) {
      if (error.code) {
        sendError(res, error.code, error.message, error.details, error.status);
      } else {
        next(error);
      }
    }
  }

  async joinSession(req: TenantRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { restaurantSlug, tableToken } = req.params;
      const { guestName, joinPin, forceNew } = req.body;

      const restaurant = req.restaurant || await Restaurant.findOne({ slug: restaurantSlug?.toLowerCase().trim() });
      if (!restaurant) {
        sendError(res, 'RESTAURANT_NOT_FOUND', 'Restaurant not found', null, 404);
        return;
      }

      const table = req.table || await Table.findOne({ token: tableToken, restaurantId: restaurant._id });
      if (!table) {
        sendError(res, 'TABLE_NOT_FOUND', 'Table not found', null, 404);
        return;
      }

      const settings = await RestaurantSettings.findOne({ restaurantId: restaurant._id });
      const paymentMode = settings?.paymentConfig?.activeMode === 'PREPAID' ? 'PREPAID' : 'POSTPAID';

      const result = await diningSessionService.joinOrCreateSession(
        restaurant._id,
        table._id,
        guestName,
        joinPin,
        forceNew,
        paymentMode
      );

      sendSuccess(res, result, 'Joined dining session successfully', 201);
    } catch (error: any) {
      if (error.code) {
        sendError(res, error.code, error.message, error.details, error.status);
      } else {
        next(error);
      }
    }
  }

  async getMenu(req: TenantRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { restaurantSlug } = req.params;

      let restaurant: any = req.restaurant;
      if (!restaurant) {
        if (!restaurantSlug) {
          sendError(res, 'TABLE_NOT_FOUND', 'The specified table or restaurant was not found', null, 404);
          return;
        }
        restaurant = await Restaurant.findOne({ slug: restaurantSlug.toLowerCase().trim() });
        if (!restaurant || ['SUSPENDED', 'ARCHIVED', 'EXPIRED'].includes(restaurant.status)) {
          sendError(res, 'TABLE_NOT_FOUND', 'The specified table or restaurant was not found', null, 404);
          return;
        }
      }

      const cacheKey = `public_menu_${restaurant._id.toString()}`;
      const cachedMenu = cacheService.get(cacheKey);
      if (cachedMenu) {
        sendSuccess(res, cachedMenu, 'Public menu retrieved successfully (cached)');
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

      cacheService.set(cacheKey, categoriesWithItems, { ttlSeconds: 120 });
      sendSuccess(res, categoriesWithItems, 'Public menu retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  async createOrder(req: TenantRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { restaurantSlug, tableToken } = req.params;
      const { items, customerNote, customerName, customerPhone, paymentStatus, diningSessionId, guestSessionId, source } = req.body;

      const restaurant = req.restaurant || await Restaurant.findOne({ slug: restaurantSlug?.toLowerCase().trim() });
      if (!restaurant) {
        sendError(res, 'RESTAURANT_NOT_FOUND', 'Restaurant not found', null, 404);
        return;
      }

      const table = req.table || await Table.findOne({ token: tableToken, restaurantId: restaurant._id });
      if (!table) {
        sendError(res, 'TABLE_NOT_FOUND', 'Table not found', null, 404);
        return;
      }

      const order = await orderService.createOrder({
        restaurantId: restaurant._id,
        tableId: table._id,
        diningSessionId,
        guestSessionId,
        orderMode: 'DINE_IN',
        items,
        customerNote,
        customerName,
        customerPhone,
        source: source || 'QR',
        paymentStatus: paymentStatus || 'PENDING',
      });

      sendSuccess(res, order, 'Order placed successfully', 201);
    } catch (error: any) {
      if (error.code) {
        sendError(res, error.code, error.message, error.details, error.status);
      } else {
        next(error);
      }
    }
  }

  async createPrepaidCheckout(req: TenantRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { restaurantSlug, tableToken } = req.params;
      const { items, customerNote, customerName, customerPhone, diningSessionId, guestSessionId } = req.body;
      const idempotencyKey = (req.headers['idempotency-key'] as string) || `idemp_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

      const restaurant = req.restaurant || await Restaurant.findOne({ slug: restaurantSlug?.toLowerCase().trim() });
      if (!restaurant) {
        sendError(res, 'RESTAURANT_NOT_FOUND', 'Restaurant not found', null, 404);
        return;
      }

      const table = req.table || (tableToken ? await Table.findOne({ token: tableToken, restaurantId: restaurant._id }) : undefined);

      const result = await checkoutService.createPrepaidCheckoutAttempt({
        restaurantId: restaurant._id,
        tableId: table?._id,
        diningSessionId,
        guestSessionId,
        idempotencyKey,
        items,
        customerName,
        customerPhone,
        customerNote,
        orderMode: 'DINE_IN',
      });

      sendSuccess(res, result, 'Prepaid checkout attempt created', 201);
    } catch (error: any) {
      if (error.code) {
        sendError(res, error.code, error.message, error.details, error.status);
      } else {
        next(error);
      }
    }
  }

  async confirmPrepaidPayment(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { checkoutAttemptId, gatewayPaymentId } = req.body;

      if (!checkoutAttemptId || !gatewayPaymentId) {
        sendError(res, 'BAD_REQUEST', 'checkoutAttemptId and gatewayPaymentId are required', null, 400);
        return;
      }

      const order = await checkoutService.confirmPrepaidPayment(checkoutAttemptId, gatewayPaymentId);
      sendSuccess(res, order, 'Payment confirmed and order placed successfully', 200);
    } catch (error: any) {
      if (error.code) {
        sendError(res, error.code, error.message, error.details, error.status);
      } else {
        next(error);
      }
    }
  }

  async requestBill(req: TenantRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { sessionId } = req.params;
      const { restaurantSlug } = req.params;

      const restaurant = req.restaurant || await Restaurant.findOne({ slug: restaurantSlug?.toLowerCase().trim() });
      const restaurantId = restaurant ? restaurant._id : req.restaurant?._id;

      if (!sessionId || !mongoose.Types.ObjectId.isValid(sessionId)) {
        sendError(res, 'BAD_REQUEST', 'Valid sessionId parameter is required', null, 400);
        return;
      }

      const bill = await billService.requestOrGenerateBill(restaurantId, sessionId);
      sendSuccess(res, bill, 'Bill generated successfully', 200);
    } catch (error: any) {
      if (error.code) {
        sendError(res, error.code, error.message, error.details, error.status);
      } else {
        next(error);
      }
    }
  }

  async reopenSession(req: TenantRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { sessionId } = req.params;
      const { restaurantSlug } = req.params;

      const restaurant = req.restaurant || await Restaurant.findOne({ slug: restaurantSlug?.toLowerCase().trim() });
      const restaurantId = restaurant ? restaurant._id : req.restaurant?._id;

      if (!sessionId || !mongoose.Types.ObjectId.isValid(sessionId)) {
        sendError(res, 'BAD_REQUEST', 'Valid sessionId parameter is required', null, 400);
        return;
      }

      const session = await billService.reopenSessionForOrdering(restaurantId, sessionId);
      sendSuccess(res, session, 'Session reopened for ordering', 200);
    } catch (error: any) {
      if (error.code) {
        sendError(res, error.code, error.message, error.details, error.status);
      } else {
        next(error);
      }
    }
  }

  async getTableSession(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { sessionId } = req.params;

      if (!mongoose.Types.ObjectId.isValid(sessionId)) {
        sendError(res, 'SESSION_NOT_FOUND', 'Session not found', null, 404);
        return;
      }

      const session = await DiningSession.findById(sessionId);
      if (!session) {
        sendError(res, 'SESSION_NOT_FOUND', 'Session not found', null, 404);
        return;
      }

      const orders = await Order.find({ diningSessionId: session._id, status: { $ne: 'CANCELLED' } }).sort({ roundNumber: 1, createdAt: 1 });
      const activeBill = await Bill.findOne({ diningSessionId: session._id, status: { $in: ['PENDING', 'SETTLED'] } }).sort({ version: -1 });

      sendSuccess(res, { session, orders, bill: activeBill }, 'Session retrieved successfully');
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

      const order = await Order.findById(orderId).select('status paymentStatus');
      if (!order) {
        sendError(res, 'ORDER_NOT_FOUND', 'Order not found', null, 404);
        return;
      }

      sendSuccess(res, { status: order.status, paymentStatus: order.paymentStatus }, 'Order status retrieved successfully');
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

  async getSessionlessMenu(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { restaurantSlug } = req.params;

      if (!restaurantSlug) {
        sendError(res, 'RESTAURANT_NOT_FOUND', 'Restaurant slug is required', null, 404);
        return;
      }

      const restaurant = await Restaurant.findOne({ slug: restaurantSlug.toLowerCase().trim() });
      if (!restaurant || ['SUSPENDED', 'ARCHIVED', 'EXPIRED'].includes(restaurant.status)) {
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

      const restaurant = await Restaurant.findOne({ slug: restaurantSlug?.toLowerCase().trim() });
      if (!restaurant) {
        sendError(res, 'RESTAURANT_NOT_FOUND', 'Restaurant not found', null, 404);
        return;
      }

      const order = await orderService.createOrder({
        restaurantId: restaurant._id,
        orderMode: orderMode || 'TAKEAWAY',
        items,
        customerNote,
        customerName,
        customerPhone,
        paymentStatus: paymentStatus || 'PENDING',
        deliveryAddress,
        source: 'QR',
      });

      sendSuccess(res, order, 'Sessionless order placed successfully', 201);
    } catch (error: any) {
      if (error.code) {
        sendError(res, error.code, error.message, error.details, error.status);
      } else {
        next(error);
      }
    }
  }

  async clearTableSession(req: TenantRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { restaurantSlug, tableToken } = req.params;
      const restaurant = req.restaurant || await Restaurant.findOne({ slug: restaurantSlug?.toLowerCase().trim() });
      const table = req.table || await Table.findOne({ token: tableToken, restaurantId: restaurant?._id });

      if (restaurant && table) {
        const activeSession = await DiningSession.findOne({
          restaurantId: restaurant._id,
          tableId: table._id,
          status: { $in: ['ACTIVE', 'BILL_REQUESTED'] },
        });

        if (activeSession) {
          await diningSessionService.closeSession(restaurant._id, activeSession._id);
        }
      }

      sendSuccess(res, { success: true }, 'Table session cleared successfully');
    } catch (error) {
      next(error);
    }
  }
}

export default PublicController;
