import { Types } from 'mongoose';
import { DiningSession, IDiningSession } from '../models/DiningSession';
import { GuestSession, IGuestSession } from '../models/GuestSession';
import { Table } from '../models/Table';
import { Restaurant } from '../models/Restaurant';
import { Order } from '../models/Order';
import { AuditLog } from '../models/AuditLog';
import { NotificationService } from './notification.service';
import crypto from 'crypto';

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

export class DiningSessionService {
  /**
   * Generates a secure random 24-character token for a guest.
   */
  generateGuestToken(): string {
    return crypto.randomBytes(18).toString('base64url');
  }

  /**
   * Generates a human-friendly session code, e.g. "S-8921"
   */
  generateSessionCode(): string {
    const num = Math.floor(1000 + Math.random() * 9000);
    return `S-${num}`;
  }

  /**
   * Generates a 4-digit join PIN, e.g. "4821"
   */
  generateJoinPin(): string {
    return Math.floor(1000 + Math.random() * 9000).toString();
  }

  /**
   * Resolves a physical table and checks for active sessions + token fence.
   */
  async resolveTable(
    restaurantSlugOrId: string,
    tableToken: string,
    guestToken?: string
  ): Promise<{
    restaurant: any;
    table: any;
    session: IDiningSession | null;
    guestSession: IGuestSession | null;
    isParticipant: boolean;
    hasOngoingMeal: boolean;
    activeSessionSummary?: any;
    status: string;
  }> {
    // 1. Resolve restaurant
    let restaurant: any;
    if (Types.ObjectId.isValid(restaurantSlugOrId)) {
      restaurant = await Restaurant.findById(restaurantSlugOrId);
    }
    if (!restaurant) {
      restaurant = await Restaurant.findOne({ slug: restaurantSlugOrId.toLowerCase().trim() });
    }
    if (!restaurant || ['SUSPENDED', 'ARCHIVED', 'EXPIRED'].includes(restaurant.status)) {
      throw new CustomError('RESTAURANT_NOT_FOUND', 'Restaurant not found or inactive', 404);
    }

    // 2. Resolve table
    const table = await Table.findOne({ token: tableToken, restaurantId: restaurant._id, isActive: true });
    if (!table) {
      throw new CustomError('TABLE_NOT_FOUND', 'Table not found or inactive', 404);
    }

    // 3. Find active session for this table
    const activeSession = await DiningSession.findOne({
      restaurantId: restaurant._id,
      tableId: table._id,
      status: { $in: ['ACTIVE', 'BILL_REQUESTED'] },
    });

    // Case 1: No active session exists on this table
    if (!activeSession) {
      return {
        restaurant,
        table,
        session: null,
        guestSession: null,
        isParticipant: false,
        hasOngoingMeal: false,
        status: 'NO_ACTIVE_SESSION',
      };
    }

    // Case 2: Active session exists, check if caller holds a valid guest token
    if (guestToken) {
      const guestSession = await GuestSession.findOne({
        diningSessionId: activeSession._id,
        guestToken,
      });

      if (guestSession) {
        guestSession.lastSeenAt = new Date();
        await guestSession.save();

        return {
          restaurant,
          table,
          session: activeSession,
          guestSession,
          isParticipant: true,
          hasOngoingMeal: true,
          status: 'PARTICIPANT_RESUMED',
        };
      }
    }

    // Case 3: Unknown device (No valid guest token) scanning an existing session
    // If Prepaid, balanceDue is 0, and all orders are SERVED (or no orders), auto-close old session
    if (activeSession.paymentMode === 'PREPAID' && activeSession.balanceDue === 0) {
      const activePendingOrders = await Order.countDocuments({
        diningSessionId: activeSession._id,
        status: { $in: ['PENDING', 'ACCEPTED', 'PREPARING', 'READY'] },
      });

      if (activePendingOrders === 0) {
        // Safe to auto-archive completed prepaid session
        activeSession.status = 'CLOSED';
        activeSession.closedAt = new Date();
        await activeSession.save();

        return {
          restaurant,
          table,
          session: null,
          guestSession: null,
          isParticipant: false,
          hasOngoingMeal: false,
          status: 'PREVIOUS_PREPAID_SESSION_AUTO_CLOSED',
        };
      }
    }

    // Case 4: Unsettled Postpaid or in-flight prepaid food -> Safety Barrier
    return {
      restaurant,
      table,
      session: null,
      guestSession: null,
      isParticipant: false,
      hasOngoingMeal: true,
      activeSessionSummary: {
        sessionId: activeSession._id,
        sessionCode: activeSession.sessionCode,
        openedAt: activeSession.openedAt,
        roundCount: activeSession.roundCount,
        paymentMode: activeSession.paymentMode,
      },
      status: 'ONGOING_MEAL_PROTECTION',
    };
  }

  /**
   * Joins an existing dining session using a 4-digit PIN, or creates a new session if none exists.
   */
  async joinOrCreateSession(
    restaurantId: Types.ObjectId | string,
    tableId: Types.ObjectId | string,
    guestName?: string,
    joinPin?: string,
    forceNew: boolean = false,
    paymentMode: 'PREPAID' | 'POSTPAID' = 'POSTPAID'
  ): Promise<{
    diningSession: IDiningSession;
    guestSession: IGuestSession;
    guestToken: string;
  }> {
    let session = await DiningSession.findOne({
      restaurantId: new Types.ObjectId(restaurantId),
      tableId: new Types.ObjectId(tableId),
      status: { $in: ['ACTIVE', 'BILL_REQUESTED'] },
    });

    let isHost = false;

    if (!session || forceNew) {
      if (session && forceNew) {
        // Force new can only be done if existing session is already settled or closed
        if (session.status === 'ACTIVE' && session.balanceDue > 0) {
          throw new CustomError(
            'ACTIVE_UNPAID_SESSION_EXISTS',
            'Cannot start a new session while an active unpaid session exists. Staff must resolve it.',
            409
          );
        }
      }

      session = new DiningSession({
        restaurantId: new Types.ObjectId(restaurantId),
        tableId: new Types.ObjectId(tableId),
        sessionCode: this.generateSessionCode(),
        joinPin: this.generateJoinPin(),
        status: 'ACTIVE',
        paymentMode,
        roundCount: 0,
        guestCount: 1,
        subtotal: 0,
        tax: 0,
        taxBreakdown: [],
        discount: 0,
        serviceCharge: 0,
        total: 0,
        paidAmount: 0,
        balanceDue: 0,
        openedAt: new Date(),
        lastActivityAt: new Date(),
      });
      await session.save();
      isHost = true;

      await AuditLog.create({
        action: 'SESSION_CREATED',
        actorRole: 'CUSTOMER',
        restaurantId: restaurantId.toString(),
        entityType: 'DiningSession',
        entityId: session._id,
        details: { sessionCode: session.sessionCode, paymentMode, tableId: tableId.toString() },
      });
    } else {
      // Joining an existing session
      if (joinPin && session.joinPin !== joinPin.trim()) {
        throw new CustomError('INVALID_JOIN_PIN', 'Incorrect table join code.', 401);
      }
      session.guestCount += 1;
      session.lastActivityAt = new Date();
      await session.save();
    }

    const guestToken = this.generateGuestToken();
    const guestSession = new GuestSession({
      diningSessionId: session._id,
      restaurantId: new Types.ObjectId(restaurantId),
      tableId: new Types.ObjectId(tableId),
      guestToken,
      guestName: guestName ? guestName.trim() : (isHost ? 'Host' : `Guest ${session.guestCount}`),
      isHost,
      joinedAt: new Date(),
      lastSeenAt: new Date(),
    });
    await guestSession.save();

    await AuditLog.create({
      action: 'GUEST_JOINED',
      actorRole: 'CUSTOMER',
      restaurantId: restaurantId.toString(),
      entityType: 'GuestSession',
      entityId: guestSession._id,
      details: {
        diningSessionId: session._id.toString(),
        guestName: guestSession.guestName,
        isHost,
      },
    });

    try {
      NotificationService.getInstance().notifySessionUpdated(
        restaurantId.toString(),
        session._id.toString(),
        session
      );
    } catch (err) {
      console.error('Failed to broadcast session update:', err);
    }

    return {
      diningSession: session,
      guestSession,
      guestToken,
    };
  }

  /**
   * Recalculates session financials by aggregating all non-cancelled orders.
   */
  async recalculateSessionFinancials(sessionId: Types.ObjectId | string): Promise<IDiningSession> {
    const session = await DiningSession.findById(sessionId);
    if (!session) {
      throw new CustomError('SESSION_NOT_FOUND', 'Dining session not found', 404);
    }

    const orders = await Order.find({
      diningSessionId: session._id,
      status: { $ne: 'CANCELLED' },
    });

    const subtotal = orders.reduce((sum, o) => sum + (o.subtotal || 0), 0);
    const tax = orders.reduce((sum, o) => sum + (o.tax || 0), 0);
    const total = subtotal + tax + (session.serviceCharge || 0) - (session.discount || 0);

    session.subtotal = subtotal;
    session.tax = tax;
    session.total = Math.max(0, total);
    session.balanceDue = Math.max(0, session.total - (session.paidAmount || 0));
    session.lastActivityAt = new Date();
    await session.save();

    return session;
  }

  /**
   * Staff/Manager explicitly marks session as CLOSED.
   */
  async closeSession(
    restaurantId: Types.ObjectId | string,
    sessionId: Types.ObjectId | string,
    staffUserId?: string
  ): Promise<IDiningSession> {
    const session = await DiningSession.findOne({
      _id: new Types.ObjectId(sessionId),
      restaurantId: new Types.ObjectId(restaurantId),
    });
    if (!session) {
      throw new CustomError('SESSION_NOT_FOUND', 'Dining session not found', 404);
    }

    session.status = 'CLOSED';
    session.closedAt = new Date();
    await session.save();

    await AuditLog.create({
      action: 'SESSION_CLOSED',
      actorId: staffUserId,
      actorRole: 'MANAGER',
      restaurantId: restaurantId.toString(),
      entityType: 'DiningSession',
      entityId: session._id,
      details: { total: session.total, paidAmount: session.paidAmount, balanceDue: session.balanceDue },
    });

    try {
      NotificationService.getInstance().notifySessionUpdated(
        restaurantId.toString(),
        session._id.toString(),
        session
      );
    } catch (err) {
      console.error('Failed to notify session closed:', err);
    }

    return session;
  }

  /**
   * Staff/Manager marks an unpaid session as ABANDONED (Walkout).
   */
  async abandonSession(
    restaurantId: Types.ObjectId | string,
    sessionId: Types.ObjectId | string,
    reason: string,
    staffUserId?: string
  ): Promise<IDiningSession> {
    const session = await DiningSession.findOne({
      _id: new Types.ObjectId(sessionId),
      restaurantId: new Types.ObjectId(restaurantId),
    });
    if (!session) {
      throw new CustomError('SESSION_NOT_FOUND', 'Dining session not found', 404);
    }

    session.status = 'ABANDONED';
    session.abandonedReason = reason.trim();
    session.closedAt = new Date();
    await session.save();

    await AuditLog.create({
      action: 'SESSION_ABANDONED',
      actorId: staffUserId,
      actorRole: 'MANAGER',
      restaurantId: restaurantId.toString(),
      entityType: 'DiningSession',
      entityId: session._id,
      details: {
        reason: session.abandonedReason,
        unpaidLossAmount: session.balanceDue,
        total: session.total,
      },
    });

    try {
      NotificationService.getInstance().notifySessionUpdated(
        restaurantId.toString(),
        session._id.toString(),
        session
      );
    } catch (err) {
      console.error('Failed to notify session abandoned:', err);
    }

    return session;
  }
}

export const diningSessionService = new DiningSessionService();
export default diningSessionService;
