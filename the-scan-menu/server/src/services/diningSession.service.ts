import { Types } from 'mongoose';
import { IDiningSession } from '../models/DiningSession';
import { IGuestSession } from '../models/GuestSession';
import { diningSessionRepository } from '../repositories/diningSession.repository';
import { guestSessionRepository } from '../repositories/guestSession.repository';
import { tableRepository } from '../repositories/table.repository';
import { restaurantRepository } from '../repositories/restaurant.repository';
import { orderRepository } from '../repositories/order.repository';
import { paymentRepository } from '../repositories/payment.repository';
import { auditLogRepository } from '../repositories/auditLog.repository';
import { NotificationService } from './notification.service';
import { accrueLoyaltyForOrder } from './order.service';
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
      restaurant = await restaurantRepository.findById(restaurantSlugOrId);
    }
    if (!restaurant) {
      restaurant = await restaurantRepository.findBySlug(restaurantSlugOrId.toLowerCase().trim());
    }
    if (!restaurant || ['SUSPENDED', 'ARCHIVED', 'EXPIRED'].includes(restaurant.status)) {
      throw new CustomError('RESTAURANT_NOT_FOUND', 'Restaurant not found or inactive', 404);
    }

    // 2. Resolve table
    const table = await tableRepository.findByTokenAndRestaurant(tableToken, restaurant._id);
    if (!table || !table.isActive) {
      throw new CustomError('TABLE_NOT_FOUND', 'Table not found or inactive', 404);
    }

    // 3. Find active session for this table
    const activeSession = await diningSessionRepository.findActiveByTableId(table._id);

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
      const guestSession = await guestSessionRepository.findByTokenAndDiningSession(guestToken, activeSession._id);

      if (guestSession) {
        guestSession.lastSeenAt = new Date();
        await guestSessionRepository.save(guestSession);

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
      const activePendingOrders = await orderRepository.countByDiningSessionId(activeSession._id, {
        status: { $in: ['PENDING', 'ACCEPTED', 'PREPARING', 'READY'] },
      });

      if (activePendingOrders === 0) {
        // Safe to auto-archive completed prepaid session
        activeSession.status = 'CLOSED';
        activeSession.closedAt = new Date();
        await diningSessionRepository.save(activeSession);

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
      session: activeSession,
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
    let session = await diningSessionRepository.findActiveByTableId(tableId);

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

      session = await diningSessionRepository.create({
        restaurantId: new Types.ObjectId(restaurantId.toString()),
        tableId: new Types.ObjectId(tableId.toString()),
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
      isHost = true;

      await auditLogRepository.create({
        action: 'SESSION_CREATED',
        actorRole: 'CUSTOMER',
        restaurantId: restaurantId.toString(),
        details: { sessionCode: session.sessionCode, paymentMode, tableId: tableId.toString() },
      });
    } else {
      // Joining an existing session
      if (joinPin && session.joinPin !== joinPin.trim()) {
        throw new CustomError('INVALID_JOIN_PIN', 'Incorrect table join code.', 401);
      }
      session.guestCount += 1;
      session.lastActivityAt = new Date();
      await diningSessionRepository.save(session);
    }

    const guestToken = this.generateGuestToken();
    const guestSession = await guestSessionRepository.create({
      diningSessionId: session._id,
      restaurantId: new Types.ObjectId(restaurantId.toString()),
      tableId: new Types.ObjectId(tableId.toString()),
      guestToken,
      guestName: guestName ? guestName.trim() : (isHost ? 'Host' : `Guest ${session.guestCount}`),
      isHost,
      joinedAt: new Date(),
      lastSeenAt: new Date(),
    });

    await auditLogRepository.create({
      action: 'GUEST_JOINED',
      actorRole: 'CUSTOMER',
      restaurantId: restaurantId.toString(),
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
    const session = await diningSessionRepository.findById(sessionId);
    if (!session) {
      throw new CustomError('SESSION_NOT_FOUND', 'Dining session not found', 404);
    }

    const orders = await orderRepository.findByDiningSessionId(session._id);
    const activeOrders = orders.filter((o) => o.status !== 'CANCELLED');

    const subtotal = activeOrders.reduce((sum, o) => sum + (o.subtotal || 0), 0);
    const tax = activeOrders.reduce((sum, o) => sum + (o.tax || 0), 0);
    const total = subtotal + tax + (session.serviceCharge || 0) - (session.discount || 0);

    session.subtotal = subtotal;
    session.tax = tax;
    session.total = Math.max(0, total);
    session.balanceDue = Math.max(0, session.total - (session.paidAmount || 0));
    session.lastActivityAt = new Date();
    await diningSessionRepository.save(session);

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
    const session = await diningSessionRepository.findByIdAndRestaurant(sessionId, restaurantId);
    if (!session) {
      throw new CustomError('SESSION_NOT_FOUND', 'Dining session not found', 404);
    }

    session.status = 'CLOSED';
    session.closedAt = new Date();
    await diningSessionRepository.save(session);

    await orderRepository.updateStatusBySessionId(session._id, 'COMPLETED');
    await orderRepository.updatePaymentStatusBySessionId(session._id, 'PAID');

    // Accrue loyalty points for all completed session orders
    const sessionOrders = await orderRepository.findByDiningSessionId(session._id);
    for (const ord of sessionOrders) {
      if (ord.status !== 'CANCELLED') {
        await accrueLoyaltyForOrder(session.restaurantId, ord).catch((err) =>
          console.error('[LoyaltyAccrual] Error accruing points on session close:', err)
        );
      }
    }

    if (session.tableId) {
      await tableRepository.updateById(session.tableId, { status: 'AVAILABLE' });
    }

    // Record payment in transactions ledger if not already recorded
    const existingPayments = await paymentRepository.findCapturedByDiningSessionId(session._id);
    if (existingPayments.length === 0 && session.total > 0) {
      await paymentRepository.create({
        restaurantId: session.restaurantId,
        diningSessionId: session._id,
        tableId: session.tableId,
        provider: 'CASH',
        method: 'CASH',
        mode: 'POSTPAID',
        amount: session.total,
        currency: 'INR',
        status: 'CAPTURED',
        metadata: {
          sessionCode: session.sessionCode,
          source: 'TABLE_SETTLEMENT',
          closedByStaffId: staffUserId,
        },
      });
    }

    await auditLogRepository.create({
      action: 'SESSION_CLOSED',
      actorId: staffUserId,
      actorRole: 'MANAGER',
      restaurantId: restaurantId.toString(),
      details: { total: session.total, paidAmount: session.paidAmount, balanceDue: session.balanceDue },
    });

    try {
      const table = await tableRepository.findById(session.tableId);
      NotificationService.getInstance().notifySessionUpdated(
        restaurantId.toString(),
        session._id.toString(),
        session,
        table?.token
      );
      if (table?.token) {
        NotificationService.getInstance().notifyTableCleared(table.token, { sessionId: session._id });
      }
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
    const session = await diningSessionRepository.findByIdAndRestaurant(sessionId, restaurantId);
    if (!session) {
      throw new CustomError('SESSION_NOT_FOUND', 'Dining session not found', 404);
    }

    session.status = 'ABANDONED';
    session.abandonedReason = reason.trim();
    session.closedAt = new Date();
    await diningSessionRepository.save(session);

    await auditLogRepository.create({
      action: 'SESSION_ABANDONED',
      actorId: staffUserId,
      actorRole: 'MANAGER',
      restaurantId: restaurantId.toString(),
      details: {
        reason: session.abandonedReason,
        unpaidLossAmount: session.balanceDue,
        total: session.total,
      },
    });

    try {
      const table = await tableRepository.findById(session.tableId);
      NotificationService.getInstance().notifySessionUpdated(
        restaurantId.toString(),
        session._id.toString(),
        session,
        table?.token
      );
      if (table?.token) {
        NotificationService.getInstance().notifyTableCleared(table.token, { sessionId: session._id });
      }
    } catch (err) {
      console.error('Failed to notify session abandoned:', err);
    }

    return session;
  }
  /**
   * Transfers an active dining session and its active orders to another table.
   */
  async transferTableSession(
    restaurantId: Types.ObjectId | string,
    sourceTableId: Types.ObjectId | string,
    targetTableId: Types.ObjectId | string,
    reason?: string,
    staffUserId?: string
  ): Promise<{ session: IDiningSession; sourceTable: any; targetTable: any }> {
    const rId = new Types.ObjectId(restaurantId.toString());
    const srcId = new Types.ObjectId(sourceTableId.toString());
    const tgtId = new Types.ObjectId(targetTableId.toString());

    if (srcId.equals(tgtId)) {
      throw new CustomError('SAME_TABLE_TRANSFER', 'Cannot transfer session to the same table', 400);
    }

    const [sourceTable, targetTable] = await Promise.all([
      tableRepository.findByIdAndRestaurant(srcId, rId),
      tableRepository.findByIdAndRestaurant(tgtId, rId),
    ]);

    if (!sourceTable || !sourceTable.isActive) {
      throw new CustomError('SOURCE_TABLE_NOT_FOUND', 'Source table not found or inactive', 404);
    }
    if (!targetTable || !targetTable.isActive) {
      throw new CustomError('TARGET_TABLE_NOT_FOUND', 'Target table not found or inactive', 404);
    }

    const activeSession = await diningSessionRepository.findActiveByTableId(srcId);

    if (!activeSession) {
      throw new CustomError('NO_ACTIVE_SESSION', 'Source table does not have an active dining session', 409);
    }

    // Check if target table already has an active session
    const targetSession = await diningSessionRepository.findActiveByTableId(tgtId);

    if (targetSession) {
      throw new CustomError(
        'TARGET_TABLE_OCCUPIED',
        `Target table ${targetTable.displayName || targetTable.tableNumber} is currently occupied with an active session`,
        409
      );
    }

    // Reassign session tableId
    activeSession.tableId = tgtId;
    activeSession.lastActivityAt = new Date();
    await diningSessionRepository.save(activeSession);

    // Reassign non-cancelled orders to new table
    await orderRepository.updateTableBySessionId(activeSession._id, tgtId);

    // Audit log
    await auditLogRepository.create({
      action: 'TABLE_TRANSFERRED',
      actorId: staffUserId,
      actorRole: 'MANAGER',
      restaurantId: rId.toString(),
      details: {
        fromTable: sourceTable.displayName || sourceTable.tableNumber,
        toTable: targetTable.displayName || targetTable.tableNumber,
        reason: reason || 'Guest relocated',
      },
    });

    // Notify clients over Socket.IO
    try {
      NotificationService.getInstance().notifyTableCleared(sourceTable.token, {
        transferredTo: targetTable.displayName || targetTable.tableNumber,
      });
      NotificationService.getInstance().notifySessionUpdated(
        rId.toString(),
        activeSession._id.toString(),
        activeSession,
        targetTable.token
      );
    } catch (err) {
      console.error('Failed to notify table transfer:', err);
    }

    return { session: activeSession, sourceTable, targetTable };
  }

  /**
   * Merges one or more secondary tables into a primary active table session.
   */
  async mergeTableSessions(
    restaurantId: Types.ObjectId | string,
    primaryTableId: Types.ObjectId | string,
    secondaryTableIds: (Types.ObjectId | string)[],
    staffUserId?: string
  ): Promise<{ primarySession: IDiningSession; primaryTable: any; mergedTables: any[] }> {
    const rId = new Types.ObjectId(restaurantId.toString());
    const primId = new Types.ObjectId(primaryTableId.toString());
    const secIds = secondaryTableIds.map((id) => new Types.ObjectId(id.toString()));

    if (secIds.length === 0) {
      throw new CustomError('NO_SECONDARY_TABLES', 'At least one secondary table is required to merge', 400);
    }

    const primaryTable = await tableRepository.findByIdAndRestaurant(primId, rId);
    if (!primaryTable || !primaryTable.isActive) {
      throw new CustomError('PRIMARY_TABLE_NOT_FOUND', 'Primary table not found', 404);
    }

    const primarySession = await diningSessionRepository.findActiveByTableId(primId);

    if (!primarySession) {
      throw new CustomError('NO_PRIMARY_SESSION', 'Primary table must have an active session to merge into', 409);
    }

    const secondaryTables = await tableRepository.findByRestaurantId(rId, { _id: { $in: secIds }, isActive: true });
    if (secondaryTables.length !== secIds.length) {
      throw new CustomError('INVALID_SECONDARY_TABLES', 'One or more secondary tables could not be found', 404);
    }

    // Add unique secondary table IDs to primary session linkedTableIds
    const existingLinked = (primarySession.linkedTableIds || []).map((id) => id.toString());
    for (const secId of secIds) {
      const sIdStr = secId.toString();
      if (sIdStr !== primId.toString() && !existingLinked.includes(sIdStr)) {
        primarySession.linkedTableIds = primarySession.linkedTableIds || [];
        primarySession.linkedTableIds.push(secId);
      }
    }

    // For any secondary table that had an active session, absorb its orders and close that session
    for (const secId of secIds) {
      const secSession = await diningSessionRepository.findActiveByTableId(secId);
      if (secSession) {
        // Reassign all active orders to primary session & primary table
        await orderRepository.updateTableBySessionId(secSession._id, primId);
        await orderRepository.updateSessionBySessionId(secSession._id, primarySession._id);

        // Close merged secondary session
        secSession.status = 'CLOSED';
        secSession.closedAt = new Date();
        secSession.abandonedReason = `Merged into Table ${primaryTable.displayName || primaryTable.tableNumber}`;
        await diningSessionRepository.save(secSession);
      }
    }

    // Recalculate primary session totals
    const allSessionOrders = await orderRepository.findByDiningSessionId(primarySession._id);
    const activeOrders = allSessionOrders.filter((o) => o.status !== 'CANCELLED');

    primarySession.subtotal = activeOrders.reduce((sum, o) => sum + (o.subtotal || 0), 0);
    primarySession.tax = activeOrders.reduce((sum, o) => sum + (o.tax || 0), 0);
    primarySession.total = activeOrders.reduce((sum, o) => sum + (o.total || 0), 0);
    primarySession.balanceDue = Math.max(0, primarySession.total - (primarySession.paidAmount || 0));
    primarySession.lastActivityAt = new Date();
    await diningSessionRepository.save(primarySession);

    // Audit log
    await auditLogRepository.create({
      action: 'TABLES_MERGED',
      actorId: staffUserId,
      actorRole: 'MANAGER',
      restaurantId: rId.toString(),
      details: {
        primaryTable: primaryTable.displayName || primaryTable.tableNumber,
        secondaryTables: secondaryTables.map((t) => t.displayName || t.tableNumber),
      },
    });

    // Sockets
    try {
      NotificationService.getInstance().notifySessionUpdated(
        rId.toString(),
        primarySession._id.toString(),
        primarySession,
        primaryTable.token
      );
      for (const st of secondaryTables) {
        NotificationService.getInstance().notifyTableCleared(st.token, {
          mergedInto: primaryTable.displayName || primaryTable.tableNumber,
        });
      }
    } catch (err) {
      console.error('Failed to notify table merge:', err);
    }

    return { primarySession, primaryTable, mergedTables: secondaryTables };
  }
}

export const diningSessionService = new DiningSessionService();
export default diningSessionService;

