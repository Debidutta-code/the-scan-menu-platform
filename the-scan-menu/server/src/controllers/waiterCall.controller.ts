import { Request, Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
import { Restaurant } from '../models/Restaurant';
import { Table } from '../models/Table';
import { WaiterCall } from '../models/WaiterCall';
import { validateWaiterCallTransition } from '../utils/waiterCallStateMachine';
import { NotificationService } from '../services/notification.service';
import { featureFlagService } from '../services/featureFlag.service';
import { sendSuccess, sendError } from '../utils/response';
import mongoose from 'mongoose';

export class WaiterCallController {
  constructor() {
    this.createWaiterCall = this.createWaiterCall.bind(this);
    this.getActiveWaiterCall = this.getActiveWaiterCall.bind(this);
    this.listWaiterCalls = this.listWaiterCalls.bind(this);
    this.acknowledgeWaiterCall = this.acknowledgeWaiterCall.bind(this);
    this.resolveWaiterCall = this.resolveWaiterCall.bind(this);
  }

  // ==========================================
  // PUBLIC ENDPOINTS
  // ==========================================

  async createWaiterCall(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { tableToken } = req.params;

      if (!tableToken) {
        sendError(res, 'TABLE_NOT_FOUND', 'The specified table or restaurant was not found', null, 404);
        return;
      }

      // 1. Resolve table and restaurant
      const table = await Table.findOne({ token: tableToken });
      if (!table || !table.isActive) {
        sendError(res, 'TABLE_NOT_FOUND', 'The specified table or restaurant was not found', null, 404);
        return;
      }

      const restaurant = await Restaurant.findById(table.restaurantId);
      if (!restaurant || restaurant.status === 'SUSPENDED') {
        sendError(res, 'TABLE_NOT_FOUND', 'The specified table or restaurant was not found', null, 404);
        return;
      }

      const isWaiterCallEnabled = await featureFlagService.isEnabled(restaurant._id.toString(), 'waiter_call');
      if (!isWaiterCallEnabled) {
        sendError(res, 'FEATURE_DISABLED', 'Waiter call assistance is currently disabled for this restaurant.', null, 403);
        return;
      }

      // 2. Auto-expire old pending calls (> 5 mins) before checking active call
      const fiveMinsAgo = new Date(Date.now() - 5 * 60 * 1000);
      await WaiterCall.updateMany(
        {
          tableId: table._id,
          status: 'PENDING',
          createdAt: { $lte: fiveMinsAgo },
        },
        { $set: { status: 'EXPIRED' } }
      );

      // Check for existing active PENDING/ACKNOWLEDGED call
      const existingCall = await WaiterCall.findOne({
        tableId: table._id,
        status: { $in: ['PENDING', 'ACKNOWLEDGED'] },
      });

      if (existingCall) {
        // Return existing open call rather than creating duplicate
        sendSuccess(res, existingCall, 'An active waiter call already exists for this table');
        return;
      }

      const { requestType } = req.body;

      // 3. Create Waiter Call
      const waiterCall = new WaiterCall({
        restaurantId: restaurant._id,
        tableId: table._id,
        tableNumberSnapshot: table.tableNumber,
        status: 'PENDING',
        requestType: requestType || 'CALL_WAITER',
        expiresAt: new Date(Date.now() + 5 * 60 * 1000),
      });

      await waiterCall.save();

      // Emit waiter_call:created to restaurant:{restaurantId} room via central NotificationService
      try {
        const payload = {
          _id: waiterCall._id,
          restaurantId: waiterCall.restaurantId,
          tableId: waiterCall.tableId,
          tableNumberSnapshot: waiterCall.tableNumberSnapshot,
          status: waiterCall.status,
          requestType: waiterCall.requestType,
          createdAt: waiterCall.createdAt,
          expiresAt: waiterCall.expiresAt,
        };
        // Notify the manager/staff dashboard (restaurant room)
        NotificationService.getInstance().notifyWaiterCallCreated(restaurant._id.toString(), payload);
        // Notify the guest's own table room so the UI goes to 'waiting' instantly
        NotificationService.getInstance().notifyTableWaiterCallCreated(tableToken, payload);
      } catch (err) {
        console.error('Failed to notify waiter call creation:', err);
      }

      sendSuccess(res, waiterCall, 'Waiter called successfully', 201);
    } catch (error) {
      next(error);
    }
  }

  async getActiveWaiterCall(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { tableToken } = req.params;

      if (!tableToken) {
        sendError(res, 'TABLE_NOT_FOUND', 'The specified table or restaurant was not found', null, 404);
        return;
      }

      // Resolve table
      const table = await Table.findOne({ token: tableToken });
      if (!table || !table.isActive) {
        sendError(res, 'TABLE_NOT_FOUND', 'The specified table or restaurant was not found', null, 404);
        return;
      }

      // Auto-expire old pending calls (> 5 mins)
      const fiveMinsAgo = new Date(Date.now() - 5 * 60 * 1000);
      await WaiterCall.updateMany(
        {
          tableId: table._id,
          status: 'PENDING',
          createdAt: { $lte: fiveMinsAgo },
        },
        { $set: { status: 'EXPIRED' } }
      );

      // Find any PENDING or ACKNOWLEDGED call
      const activeCall = await WaiterCall.findOne({
        tableId: table._id,
        status: { $in: ['PENDING', 'ACKNOWLEDGED'] },
      });

      sendSuccess(res, activeCall, 'Active waiter call retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  // ==========================================
  // STAFF/MANAGER ENDPOINTS (Requires Auth)
  // ==========================================

  async listWaiterCalls(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { restaurantId } = req.params;
      const statusFilter = req.query.status as string;
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 50;
      const skip = (page - 1) * limit;

      // Auto-expire pending calls older than 5 mins for this restaurant
      const fiveMinsAgo = new Date(Date.now() - 5 * 60 * 1000);
      await WaiterCall.updateMany(
        {
          restaurantId: new mongoose.Types.ObjectId(restaurantId),
          status: 'PENDING',
          createdAt: { $lte: fiveMinsAgo },
        },
        { $set: { status: 'EXPIRED' } }
      );

      const query: Record<string, any> = {
        restaurantId: new mongoose.Types.ObjectId(restaurantId),
      };

      if (statusFilter === 'ACTIVE') {
        query.status = { $in: ['PENDING', 'ACKNOWLEDGED'] };
      } else if (statusFilter === 'HISTORY') {
        query.status = { $in: ['RESOLVED', 'EXPIRED', 'CANCELLED'] };
      } else if (statusFilter) {
        query.status = statusFilter;
      }

      const total = await WaiterCall.countDocuments(query);
      const waiterCalls = await WaiterCall.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit);

      const responseData = {
        waiterCalls,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit) || 1,
        },
      };

      sendSuccess(res, responseData, 'Waiter calls retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  async acknowledgeWaiterCall(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { restaurantId, callId } = req.params;
      const user = req.user!;

      if (!mongoose.Types.ObjectId.isValid(callId)) {
        sendError(res, 'WAITER_CALL_NOT_FOUND', 'Waiter call record not found', null, 404);
        return;
      }

      const waiterCall = await WaiterCall.findOne({
        _id: new mongoose.Types.ObjectId(callId),
        restaurantId: new mongoose.Types.ObjectId(restaurantId),
      });

      if (!waiterCall) {
        sendError(res, 'WAITER_CALL_NOT_FOUND', 'Waiter call record not found', null, 404);
        return;
      }

      // Check transition in state machine
      const validation = validateWaiterCallTransition(waiterCall.status, 'ACKNOWLEDGED');
      if (!validation.isValid) {
        sendError(
          res,
          'INVALID_STATUS_TRANSITION',
          validation.errorMessage || 'Invalid status transition.',
          null,
          400
        );
        return;
      }

      const staffName = user.name || (user.email ? user.email.split('@')[0] : 'Captain');

      waiterCall.status = 'ACKNOWLEDGED';
      waiterCall.acknowledgedAt = new Date();
      waiterCall.acknowledgedBy = {
        userId: new mongoose.Types.ObjectId(user.id),
        name: staffName,
        role: user.role || 'STAFF',
      };
      await waiterCall.save();

      // Emit status updated to keep all staff clients and the guest table in sync
      try {
        const metadata = {
          acknowledgedBy: waiterCall.acknowledgedBy,
          tableNumberSnapshot: waiterCall.tableNumberSnapshot,
        };

        NotificationService.getInstance().notifyWaiterCallResolved(
          restaurantId,
          waiterCall._id.toString(),
          'ACKNOWLEDGED',
          waiterCall.acknowledgedAt,
          metadata
        );
        // Look up the table token so we can push to the guest's table room
        const tableForAck = await Table.findById(waiterCall.tableId).select('token').lean();
        if (tableForAck?.token) {
          NotificationService.getInstance().notifyTableWaiterCallResolved(
            tableForAck.token,
            waiterCall._id.toString(),
            'ACKNOWLEDGED',
            waiterCall.acknowledgedAt,
            metadata
          );
        }
      } catch (err) {
        console.error('Failed to notify waiter call status update:', err);
      }

      sendSuccess(res, waiterCall, 'Waiter call acknowledged successfully');
    } catch (error) {
      next(error);
    }
  }

  async resolveWaiterCall(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { restaurantId, callId } = req.params;
      const user = req.user!;

      if (!mongoose.Types.ObjectId.isValid(callId)) {
        sendError(res, 'WAITER_CALL_NOT_FOUND', 'Waiter call record not found', null, 404);
        return;
      }

      const waiterCall = await WaiterCall.findOne({
        _id: new mongoose.Types.ObjectId(callId),
        restaurantId: new mongoose.Types.ObjectId(restaurantId),
      });

      if (!waiterCall) {
        sendError(res, 'WAITER_CALL_NOT_FOUND', 'Waiter call record not found', null, 404);
        return;
      }

      // Check transition in state machine
      const validation = validateWaiterCallTransition(waiterCall.status, 'RESOLVED');
      if (!validation.isValid) {
        sendError(
          res,
          'INVALID_STATUS_TRANSITION',
          validation.errorMessage || 'Invalid status transition.',
          null,
          400
        );
        return;
      }

      const staffName = user.name || (user.email ? user.email.split('@')[0] : 'Captain');

      waiterCall.status = 'RESOLVED';
      waiterCall.resolvedAt = new Date();
      waiterCall.resolvedBy = {
        userId: new mongoose.Types.ObjectId(user.id),
        name: staffName,
        role: user.role || 'STAFF',
      };
      await waiterCall.save();

      // Emit waiter_call:resolved to restaurant room and guest table room
      try {
        const metadata = {
          resolvedBy: waiterCall.resolvedBy,
          tableNumberSnapshot: waiterCall.tableNumberSnapshot,
        };

        NotificationService.getInstance().notifyWaiterCallResolved(
          restaurantId,
          waiterCall._id.toString(),
          'RESOLVED',
          waiterCall.resolvedAt,
          metadata
        );
        // Look up the table token so we can push to the guest's table room
        const tableForResolve = await Table.findById(waiterCall.tableId).select('token').lean();
        if (tableForResolve?.token) {
          NotificationService.getInstance().notifyTableWaiterCallResolved(
            tableForResolve.token,
            waiterCall._id.toString(),
            'RESOLVED',
            waiterCall.resolvedAt,
            metadata
          );
        }
      } catch (err) {
        console.error('Failed to notify waiter call resolution:', err);
      }

      sendSuccess(res, waiterCall, 'Waiter call resolved successfully');
    } catch (error) {
      next(error);
    }
  }
}
export default WaiterCallController;
