import { Request, Response, NextFunction } from 'express';
import { TenantRequest } from '../middleware/tenantResolver.middleware';
import { CustomerAuthenticatedRequest } from '../middleware/customerAuth';
import { Restaurant } from '../models/Restaurant';
import { RestaurantSettings } from '../models/RestaurantSettings';
import { Table } from '../models/Table';
import { Category } from '../models/Category';
import { MenuItem } from '../models/MenuItem';
import { Order } from '../models/Order';
import { DiningSession } from '../models/DiningSession';
import { Bill } from '../models/Bill';
import { Tax } from '../models/Tax';
import { IdempotencyRecord } from '../models/IdempotencyRecord';
import { diningSessionService } from '../services/diningSession.service';
import { orderService } from '../services/order.service';
import { checkoutService } from '../services/checkout.service';
import { billService } from '../services/bill.service';
import { sendSuccess, sendError } from '../utils/response';
import { cacheService } from '../utils/cacheService';
import {
  toCustomerSafeOrderDTO,
  toCustomerSafeDiningSessionDTO,
} from '../utils/dto';
import mongoose from 'mongoose';
import crypto from 'crypto';

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

  /**
   * GET /api/v1/public/table/:tableToken
   * Resolves physical table context, branding, and active dining session summary.
   */
  async resolveTable(req: TenantRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { restaurantSlug, tableToken } = req.params;
      const guestToken = (req.headers['x-guest-token'] as string) || (req.query.guestToken as string);

      const restaurantIdentifier = req.restaurant
        ? req.restaurant.slug
        : (restaurantSlug || (req.restaurant as any)?._id?.toString());
      const token = tableToken || req.table?.token;

      if (!token) {
        sendError(res, 'TABLE_NOT_FOUND', 'Table token is missing', null, 400);
        return;
      }

      const resolution = await diningSessionService.resolveTable(restaurantIdentifier, token, guestToken);
      const settings = await RestaurantSettings.findOne({ restaurantId: resolution.restaurant._id });

      const responseData = {
        restaurant: {
          id: resolution.restaurant._id ? resolution.restaurant._id.toString() : resolution.restaurant.id,
          name: resolution.restaurant.name,
          slug: resolution.restaurant.slug,
          code: resolution.restaurant.code,
          status: resolution.restaurant.status,
          logoUrl: settings?.branding?.logoUrl || resolution.restaurant.logoUrl,
          coverImageUrl: settings?.branding?.coverImageUrl || resolution.restaurant.coverImageUrl,
          description: resolution.restaurant.description,
          googleReviewUrl: settings?.branding?.googleReviewUrl,
          theme: settings?.theme || {
            primaryColor: '#111827',
            secondaryColor: '#FFFFFF',
            accentColor: '#F59E0B',
            fontFamily: 'Plus Jakarta Sans',
          },
          currency: settings?.currency || 'INR',
          timezone: settings?.timezone || 'Asia/Kolkata',
          taxRatePercent: settings?.paymentConfig?.taxRatePercent || 0,
          paymentConfig: settings?.paymentConfig || { activeProvider: 'CASH', activeMode: 'POSTPAID' },
          orderWorkflowMode: settings?.workflow?.orderWorkflowMode || 'FIVE_STEP',
          autoAcceptConfig: settings?.workflow?.autoAcceptConfig || { enabled: false, delaySeconds: 10 },
        },
        table: {
          id: resolution.table._id ? resolution.table._id.toString() : resolution.table.id,
          displayName: resolution.table.displayName,
          tableNumber: resolution.table.tableNumber,
          token: resolution.table.token,
          activeSessionId: resolution.session
            ? (resolution.session._id ? resolution.session._id.toString() : resolution.session.id)
            : resolution.activeSessionSummary?.sessionId || null,
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

  /**
   * POST /api/v1/public/table/:tableToken/join
   * Joins an existing dining session or creates a new one.
   */
  async joinSession(req: TenantRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { restaurantSlug, tableToken } = req.params;
      const { guestName, joinPin, forceNew } = req.body;

      const restaurant = req.restaurant || (await Restaurant.findOne({ slug: restaurantSlug?.toLowerCase().trim() }));
      if (!restaurant) {
        sendError(res, 'RESTAURANT_NOT_FOUND', 'Restaurant not found', null, 404);
        return;
      }

      const table = req.table || (await Table.findOne({ token: tableToken, restaurantId: restaurant._id }));
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

  /**
   * GET /api/v1/public/table/:tableToken/menu
   * Returns active menu categories and items.
   */
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

  /**
   * POST /api/v1/public/table/:tableToken/orders
   * Idempotent postpaid order creation.
   * Concurrency-safe against double-clicks and network retries.
   */
  async createOrder(
    req: TenantRequest & CustomerAuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    let lockAcquired = false;
    let idempotencyKeyStr = '';
    const restaurant = req.restaurant;
    const table = req.table;

    try {
      if (!restaurant) {
        sendError(res, 'RESTAURANT_NOT_FOUND', 'Restaurant not found', null, 404);
        return;
      }

      if (!table) {
        sendError(res, 'TABLE_NOT_FOUND', 'Table not found', null, 404);
        return;
      }

      const {
        items,
        customerNote,
        customerName,
        customerPhone,
        paymentStatus,
        diningSessionId,
        guestSessionId,
        source,
      } = req.body;

      // Extract or generate idempotency key
      const rawKey =
        (req.headers['idempotency-key'] as string) ||
        (req.headers['x-idempotency-key'] as string) ||
        req.body.idempotencyKey;

      idempotencyKeyStr = rawKey
        ? rawKey.trim()
        : `idemp_${table._id.toString()}_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

      // Compute request payload hash
      const requestPayloadString = JSON.stringify({
        items,
        customerNote: customerNote || '',
        customerName: customerName || '',
        customerPhone: customerPhone || '',
      });
      const requestHash = crypto.createHash('sha256').update(requestPayloadString).digest('hex');

      // Attempt atomic insert of IdempotencyRecord
      try {
        await IdempotencyRecord.create({
          key: idempotencyKeyStr,
          restaurantId: restaurant._id,
          diningSessionId: diningSessionId && mongoose.Types.ObjectId.isValid(diningSessionId)
            ? new mongoose.Types.ObjectId(diningSessionId)
            : undefined,
          endpoint: req.originalUrl || req.path,
          requestHash,
          status: 'IN_PROGRESS',
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        });
        lockAcquired = true;
      } catch (insertErr: any) {
        // Duplicate key (E11000) -> Record exists
        if (insertErr.code === 11000) {
          const existingRecord = await IdempotencyRecord.findOne({
            key: idempotencyKeyStr,
            restaurantId: restaurant._id,
          });

          if (existingRecord) {
            // Verify request hash matches
            if (existingRecord.requestHash !== requestHash) {
              sendError(
                res,
                'IDEMPOTENCY_CONFLICT',
                'Idempotency key was previously used with a different order payload',
                null,
                409
              );
              return;
            }

            // If previously completed, return cached response
            if (existingRecord.status === 'COMPLETED' && existingRecord.responseBody) {
              sendSuccess(
                res,
                existingRecord.responseBody,
                'Order retrieved successfully (idempotent)',
                200
              );
              return;
            }

            // If in-progress, reject concurrent execution
            if (existingRecord.status === 'IN_PROGRESS') {
              sendError(
                res,
                'ORDER_IN_PROGRESS',
                'Your order is currently being processed. Please wait.',
                null,
                409
              );
              return;
            }
          }
        } else {
          throw insertErr;
        }
      }

      // Auto-link authenticated customer identity if present on request
      const effectiveCustomerId = req.customer?._id || undefined;
      const effectiveCustomerName = req.customer?.name || customerName;
      const effectiveCustomerPhone = req.customer?.phone || customerPhone;

      // Place order via OrderService
      const order = await orderService.createOrder({
        restaurantId: restaurant._id,
        tableId: table._id,
        diningSessionId,
        guestSessionId,
        customerId: effectiveCustomerId,
        orderMode: 'DINE_IN',
        items,
        customerNote,
        customerName: effectiveCustomerName,
        customerPhone: effectiveCustomerPhone,
        source: source || 'QR',
        paymentStatus: paymentStatus || 'PENDING',
      });

      const safeOrderDTO = toCustomerSafeOrderDTO(order, true);

      // Complete idempotency record
      if (lockAcquired) {
        await IdempotencyRecord.updateOne(
          { key: idempotencyKeyStr, restaurantId: restaurant._id },
          {
            $set: {
              status: 'COMPLETED',
              orderId: order._id,
              responseBody: safeOrderDTO,
            },
          }
        );
      }

      const statusCode = (order as any).isMerged ? 200 : 201;
      const message = (order as any).isMerged ? 'Order merged successfully' : 'Order placed successfully';
      sendSuccess(res, safeOrderDTO, message, statusCode);
    } catch (error: any) {
      if (lockAcquired && idempotencyKeyStr && restaurant) {
        // Release or fail lock on error
        await IdempotencyRecord.deleteOne({
          key: idempotencyKeyStr,
          restaurantId: restaurant._id,
        }).catch(() => {});
      }

      if (error.code) {
        sendError(res, error.code, error.message, error.details, error.status);
      } else {
        next(error);
      }
    }
  }

  /**
   * POST /api/v1/public/table/:tableToken/checkout/prepaid
   * Prepaid checkout intent creation (preserves existing Razorpay integration).
   */
  async createPrepaidCheckout(req: TenantRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { restaurantSlug, tableToken } = req.params;
      const { items, customerNote, customerName, customerPhone, diningSessionId, guestSessionId } = req.body;
      const idempotencyKey =
        (req.headers['idempotency-key'] as string) ||
        `idemp_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

      const restaurant = req.restaurant || (await Restaurant.findOne({ slug: restaurantSlug?.toLowerCase().trim() }));
      if (!restaurant) {
        sendError(res, 'RESTAURANT_NOT_FOUND', 'Restaurant not found', null, 404);
        return;
      }

      const table =
        req.table || (tableToken ? await Table.findOne({ token: tableToken, restaurantId: restaurant._id }) : undefined);

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

  /**
   * POST /api/v1/public/checkout/prepaid/confirm
   * Confirms payment and creates order ticket.
   */
  async confirmPrepaidPayment(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { checkoutAttemptId, gatewayPaymentId } = req.body;

      if (!checkoutAttemptId || !gatewayPaymentId) {
        sendError(res, 'BAD_REQUEST', 'checkoutAttemptId and gatewayPaymentId are required', null, 400);
        return;
      }

      const order = await checkoutService.confirmPrepaidPayment(checkoutAttemptId, gatewayPaymentId);
      const safeOrderDTO = toCustomerSafeOrderDTO(order, true);
      sendSuccess(res, safeOrderDTO, 'Payment confirmed and order placed successfully', 200);
    } catch (error: any) {
      if (error.code) {
        sendError(res, error.code, error.message, error.details, error.status);
      } else {
        next(error);
      }
    }
  }

  /**
   * POST /api/v1/public/table-sessions/:sessionId/bill/request
   */
  async requestBill(req: TenantRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { sessionId, restaurantSlug } = req.params;

      const restaurant = req.restaurant || (await Restaurant.findOne({ slug: restaurantSlug?.toLowerCase().trim() }));
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

  /**
   * POST /api/v1/public/table-sessions/:sessionId/reopen
   */
  async reopenSession(req: TenantRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { sessionId, restaurantSlug } = req.params;

      const restaurant = req.restaurant || (await Restaurant.findOne({ slug: restaurantSlug?.toLowerCase().trim() }));
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

  /**
   * GET /api/v1/public/table/:tableToken/session
   * (And legacy fallback /api/v1/public/table-sessions/:sessionId)
   * Returns sanitized shared table session and active orders.
   * All diners at the table see table orders; other diners' phone numbers are redacted.
   */
  async getTableSession(
    req: TenantRequest & CustomerAuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { sessionId } = req.params;
      let session: any = null;

      if (req.table && req.restaurant) {
        // Preferred: Scoped by active table token
        session = await DiningSession.findOne({
          restaurantId: req.restaurant._id,
          tableId: req.table._id,
          status: { $in: ['ACTIVE', 'BILL_REQUESTED'] },
        });
      } else if (sessionId && mongoose.Types.ObjectId.isValid(sessionId)) {
        // Fallback by sessionId if tenant matches
        const query: any = { _id: sessionId };
        if (req.restaurant) {
          query.restaurantId = req.restaurant._id;
        }
        session = await DiningSession.findOne(query);
      }

      if (!session) {
        sendError(res, 'SESSION_NOT_FOUND', 'Active dining session not found for this table', null, 404);
        return;
      }

      const orders = await Order.find({
        diningSessionId: session._id,
        status: { $ne: 'CANCELLED' },
      }).sort({ roundNumber: 1, createdAt: 1 });

      const activeBill = await Bill.findOne({
        diningSessionId: session._id,
        status: { $in: ['PENDING', 'SETTLED'] },
      }).sort({ version: -1 });

      const currentCustomerId = req.customer?._id?.toString();
      const sanitizedSession = toCustomerSafeDiningSessionDTO(
        session,
        orders,
        activeBill,
        currentCustomerId
      );

      sendSuccess(res, sanitizedSession, 'Session retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/public/table/:tableToken/orders/:orderId
   * (And legacy fallback /api/v1/public/orders/:orderId)
   * Scoped to the verified table context and tenant.
   */
  async getOrder(
    req: TenantRequest & CustomerAuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { orderId } = req.params;

      if (!orderId || !mongoose.Types.ObjectId.isValid(orderId)) {
        sendError(res, 'ORDER_NOT_FOUND', 'Order not found', null, 404);
        return;
      }

      const query: any = { _id: orderId };

      if (req.restaurant) {
        query.restaurantId = req.restaurant._id;
      }
      if (req.table) {
        query.tableId = req.table._id;
      }

      const order = await Order.findOne(query);
      if (!order) {
        sendError(res, 'ORDER_NOT_FOUND', 'Order not found', null, 404);
        return;
      }

      const isOwnerOrStaff =
        !!(req.customer && order.customerId && order.customerId.toString() === req.customer._id.toString());

      const safeOrderDTO = toCustomerSafeOrderDTO(order, isOwnerOrStaff);
      sendSuccess(res, safeOrderDTO, 'Order retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/public/table/:tableToken/orders/:orderId/status
   * Returns order and payment status.
   */
  async getOrderStatus(req: TenantRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { orderId } = req.params;

      if (!orderId || !mongoose.Types.ObjectId.isValid(orderId)) {
        sendError(res, 'ORDER_NOT_FOUND', 'Order not found', null, 404);
        return;
      }

      const query: any = { _id: orderId };
      if (req.restaurant) {
        query.restaurantId = req.restaurant._id;
      }
      if (req.table) {
        query.tableId = req.table._id;
      }

      const order = await Order.findOne(query).select('status paymentStatus');
      if (!order) {
        sendError(res, 'ORDER_NOT_FOUND', 'Order not found', null, 404);
        return;
      }

      sendSuccess(
        res,
        { status: order.status, paymentStatus: order.paymentStatus },
        'Order status retrieved successfully'
      );
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/public/taxes
   */
  async getTaxes(req: TenantRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const restaurantId = req.restaurant?._id || req.params.restaurantId;

      if (!restaurantId || !mongoose.Types.ObjectId.isValid(restaurantId)) {
        sendError(res, 'RESTAURANT_NOT_FOUND', 'Restaurant not found', null, 404);
        return;
      }

      const activeTaxes = await Tax.find({ restaurantId, isActive: true });
      sendSuccess(res, activeTaxes, 'Taxes retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/public/menu
   */
  async getSessionlessMenu(req: TenantRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { restaurantSlug } = req.params;

      const restaurant =
        req.restaurant ||
        (restaurantSlug ? await Restaurant.findOne({ slug: restaurantSlug.toLowerCase().trim() }) : null);

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
          id: restaurant._id.toString(),
          name: restaurant.name,
          slug: restaurant.slug,
          code: restaurant.code,
          status: restaurant.status,
          logoUrl: settings?.branding?.logoUrl || restaurant.logoUrl,
          coverImageUrl: settings?.branding?.coverImageUrl || restaurant.coverImageUrl,
          description: restaurant.description,
          theme: settings?.theme || {
            primaryColor: '#111827',
            secondaryColor: '#FFFFFF',
            accentColor: '#F59E0B',
            fontFamily: 'Plus Jakarta Sans',
          },
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

  /**
   * POST /api/v1/public/orders
   * Idempotent sessionless order creation (Takeaway / Delivery).
   */
  async createSessionlessOrder(
    req: Request & CustomerAuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    let lockAcquired = false;
    let idempotencyKeyStr = '';
    let restaurant: any = null;

    try {
      const { restaurantSlug } = req.params;
      const {
        orderMode,
        items,
        customerNote,
        customerName,
        customerPhone,
        deliveryAddress,
        paymentStatus,
      } = req.body;

      restaurant = (req as any).restaurant || (await Restaurant.findOne({ slug: restaurantSlug?.toLowerCase().trim() }));
      if (!restaurant) {
        sendError(res, 'RESTAURANT_NOT_FOUND', 'Restaurant not found', null, 404);
        return;
      }

      const rawKey =
        (req.headers['idempotency-key'] as string) ||
        (req.headers['x-idempotency-key'] as string) ||
        req.body.idempotencyKey;

      idempotencyKeyStr = rawKey
        ? rawKey.trim()
        : `idemp_sessless_${restaurant._id.toString()}_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

      const requestPayloadString = JSON.stringify({
        items,
        customerNote: customerNote || '',
        customerName: customerName || '',
        customerPhone: customerPhone || '',
        orderMode,
      });
      const requestHash = crypto.createHash('sha256').update(requestPayloadString).digest('hex');

      try {
        await IdempotencyRecord.create({
          key: idempotencyKeyStr,
          restaurantId: restaurant._id,
          endpoint: req.originalUrl || req.path,
          requestHash,
          status: 'IN_PROGRESS',
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        });
        lockAcquired = true;
      } catch (insertErr: any) {
        if (insertErr.code === 11000) {
          const existingRecord = await IdempotencyRecord.findOne({
            key: idempotencyKeyStr,
            restaurantId: restaurant._id,
          });

          if (existingRecord) {
            if (existingRecord.requestHash !== requestHash) {
              sendError(
                res,
                'IDEMPOTENCY_CONFLICT',
                'Idempotency key was previously used with a different order payload',
                null,
                409
              );
              return;
            }

            if (existingRecord.status === 'COMPLETED' && existingRecord.responseBody) {
              sendSuccess(
                res,
                existingRecord.responseBody,
                'Sessionless order retrieved successfully (idempotent)',
                200
              );
              return;
            }

            if (existingRecord.status === 'IN_PROGRESS') {
              sendError(
                res,
                'ORDER_IN_PROGRESS',
                'Your order is currently being processed. Please wait.',
                null,
                409
              );
              return;
            }
          }
        } else {
          throw insertErr;
        }
      }

      const effectiveCustomerId = req.customer?._id || undefined;
      const effectiveCustomerName = req.customer?.name || customerName;
      const effectiveCustomerPhone = req.customer?.phone || customerPhone;

      // Validate required fields for non-dine-in ordering modes
      const effectiveMode = orderMode || 'TAKEAWAY';
      if (['TAKEAWAY', 'DELIVERY'].includes(effectiveMode)) {
        if (!effectiveCustomerName?.trim()) {
          sendError(res, 'VALIDATION_ERROR', 'Customer name is required for TAKEAWAY and DELIVERY orders', null, 400);
          if (lockAcquired && idempotencyKeyStr && restaurant) {
            await IdempotencyRecord.deleteOne({ key: idempotencyKeyStr, restaurantId: restaurant._id }).catch(() => {});
          }
          return;
        }
      }

      if (effectiveMode === 'DELIVERY') {
        if (!deliveryAddress || typeof deliveryAddress !== 'object' || !deliveryAddress.street) {
          sendError(res, 'VALIDATION_ERROR', 'Delivery address is required for DELIVERY orders', null, 400);
          if (lockAcquired && idempotencyKeyStr && restaurant) {
            await IdempotencyRecord.deleteOne({ key: idempotencyKeyStr, restaurantId: restaurant._id }).catch(() => {});
          }
          return;
        }
      }

      const order = await orderService.createOrder({
        restaurantId: restaurant._id,
        orderMode: orderMode || 'TAKEAWAY',
        items,
        customerNote,
        customerName: effectiveCustomerName,
        customerPhone: effectiveCustomerPhone,
        customerId: effectiveCustomerId,
        paymentStatus: paymentStatus || 'PENDING',
        deliveryAddress,
        source: 'QR',
      });

      const safeOrderDTO = toCustomerSafeOrderDTO(order, true);

      if (lockAcquired) {
        await IdempotencyRecord.updateOne(
          { key: idempotencyKeyStr, restaurantId: restaurant._id },
          {
            $set: {
              status: 'COMPLETED',
              orderId: order._id,
              responseBody: safeOrderDTO,
            },
          }
        );
      }

      sendSuccess(res, safeOrderDTO, 'Sessionless order placed successfully', 201);
    } catch (error: any) {
      if (lockAcquired && idempotencyKeyStr && restaurant) {
        await IdempotencyRecord.deleteOne({
          key: idempotencyKeyStr,
          restaurantId: restaurant._id,
        }).catch(() => {});
      }

      if (error.code) {
        sendError(res, error.code, error.message, error.details, error.status);
      } else {
        next(error);
      }
    }
  }

  /**
   * POST /api/v1/public/table/:tableToken/clear-session
   * Disabled in public API to prevent unauthenticated session termination.
   */
  async clearTableSession(_req: Request, res: Response): Promise<void> {
    sendError(
      res,
      'FORBIDDEN',
      'Dining sessions can only be closed by authorized restaurant staff',
      null,
      403
    );
  }
}

export default PublicController;
