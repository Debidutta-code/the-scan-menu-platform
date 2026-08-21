import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
import { Restaurant } from '../models/Restaurant';
import { RestaurantSettings } from '../models/RestaurantSettings';
import { Table } from '../models/Table';
import { TableZone } from '../models/TableZone';
import { Tax } from '../models/Tax';
import { User } from '../models/User';
import { RestaurantStaff } from '../models/RestaurantStaff';
import { TableService } from '../services/table.service';
import { DiningSession } from '../models/DiningSession';
import { Order } from '../models/Order';
import { diningSessionService } from '../services/diningSession.service';
import { restaurantStatsService } from '../services/restaurantStats.service';
import { customerService } from '../services/customer.service';
import { NotificationService } from '../services/notification.service';
import { sendSuccess, sendError } from '../utils/response';
import config from '../config';
import mongoose from 'mongoose';
import bcrypt from 'bcrypt';
import { FeatureFlag } from '../models/FeatureFlag';

const tableService = new TableService();

export class RestaurantController {
  constructor() {
    this.getRestaurantProfile = this.getRestaurantProfile.bind(this);
    this.editRestaurantProfile = this.editRestaurantProfile.bind(this);
    this.listTables = this.listTables.bind(this);
    this.createTable = this.createTable.bind(this);
    this.bulkCreateTables = this.bulkCreateTables.bind(this);
    this.editTable = this.editTable.bind(this);
    this.deleteTable = this.deleteTable.bind(this);
    this.activateTable = this.activateTable.bind(this);
    this.deactivateTable = this.deactivateTable.bind(this);
    this.regenerateTableQr = this.regenerateTableQr.bind(this);
    this.getTableQr = this.getTableQr.bind(this);
    this.updateTableStatus = this.updateTableStatus.bind(this);
    this.clearTables = this.clearTables.bind(this);
    this.reserveTables = this.reserveTables.bind(this);

    // Waiter Staff Management
    this.createStaff = this.createStaff.bind(this);
    this.createTax = this.createTax.bind(this);
    this.updateTax = this.updateTax.bind(this);
    this.deleteTax = this.deleteTax.bind(this);
    this.listCustomers = this.listCustomers.bind(this);
    this.getCustomerDetails = this.getCustomerDetails.bind(this);
    this.listStaff = this.listStaff.bind(this);
    this.updateStaff = this.updateStaff.bind(this);
    this.deleteStaff = this.deleteStaff.bind(this);
  }

  async createStaff(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { restaurantId } = req.params;
      const { email, name, password, pin } = req.body;

      if (!email || !name || !password) {
        sendError(res, 'BAD_REQUEST', 'Email, name, and password are required', null, 400);
        return;
      }

      // Check if user already exists
      const existingUser = await User.findOne({ email: email.toLowerCase().trim() });
      if (existingUser) {
        sendError(res, 'USER_ALREADY_EXISTS', 'A user with this email already exists', null, 400);
        return;
      }

      const passwordHash = await bcrypt.hash(password, 10);
      const staffUser = new User({
        email: email.toLowerCase().trim(),
        passwordHash,
        name: name.trim(),
        role: 'STAFF',
        isActive: true,
        pin: pin ? pin.trim() : undefined,
      });

      await staffUser.save();

      // Create RestaurantStaff row
      const staffJoin = new RestaurantStaff({
        userId: staffUser._id,
        restaurantId: new mongoose.Types.ObjectId(restaurantId),
        role: 'STAFF',
        isActive: true,
      });
      await staffJoin.save();
      await restaurantStatsService.incrementStaff(restaurantId, 1);

      sendSuccess(res, { id: staffUser._id, email: staffUser.email, name: staffUser.name, role: staffUser.role, pin: staffUser.pin }, 'Staff created and associated successfully', 201);
    } catch (error) {
      next(error);
    }
  }

  async listStaff(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { restaurantId } = req.params;

      const staffJoins = await RestaurantStaff.find({
        restaurantId: new mongoose.Types.ObjectId(restaurantId),
        role: 'STAFF',
        isActive: true,
      }).populate('userId');

      const staffUsers = staffJoins
        .map((j) => j.userId)
        .filter((u) => u !== null);

      sendSuccess(res, staffUsers, 'Staff listed successfully');
    } catch (error) {
      next(error);
    }
  }

  async updateStaff(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { restaurantId, staffId } = req.params;
      const { name, email, password, pin } = req.body;

      const staffJoin = await RestaurantStaff.findOne({
        userId: new mongoose.Types.ObjectId(staffId),
        restaurantId: new mongoose.Types.ObjectId(restaurantId),
      });

      if (!staffJoin) {
        sendError(res, 'STAFF_NOT_FOUND', 'Staff association not found', null, 404);
        return;
      }

      const user = await User.findById(staffId);
      if (!user) {
        sendError(res, 'USER_NOT_FOUND', 'User not found', null, 404);
        return;
      }

      if (email && email.toLowerCase().trim() !== user.email) {
        const existing = await User.findOne({ email: email.toLowerCase().trim() });
        if (existing) {
          sendError(res, 'USER_ALREADY_EXISTS', 'Email already in use', null, 400);
          return;
        }
        user.email = email.toLowerCase().trim();
      }

      if (name) user.name = name.trim();
      if (password) user.passwordHash = await bcrypt.hash(password, 10);
      if (pin !== undefined) user.pin = pin ? pin.trim() : undefined;

      await user.save();

      sendSuccess(res, { id: user._id, email: user.email, name: user.name, role: user.role, pin: user.pin, isActive: user.isActive }, 'Staff updated successfully');
    } catch (error) {
      next(error);
    }
  }

  async deleteStaff(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { restaurantId, staffId } = req.params;

      // Soft-delete: deactivate the RestaurantStaff link so historical data is preserved.
      // requireRestaurantAccess checks isActive: true, so this revokes access immediately.
      const staffJoin = await RestaurantStaff.findOneAndUpdate(
        {
          userId: new mongoose.Types.ObjectId(staffId),
          restaurantId: new mongoose.Types.ObjectId(restaurantId),
          isActive: true,
        },
        { isActive: false },
        { new: true }
      );

      if (!staffJoin) {
        sendError(res, 'STAFF_NOT_FOUND', 'Staff association not found or already removed', null, 404);
        return;
      }

      // Also deactivate the User account so they cannot log in to other tenants either
      await User.findByIdAndUpdate(staffId, { isActive: false });
      await restaurantStatsService.incrementStaff(restaurantId, -1);

      sendSuccess(res, {}, 'Staff member removed from restaurant successfully');
    } catch (error) {
      next(error);
    }
  }

  async getRestaurantProfile(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { restaurantId } = req.params;
      const restaurant = await Restaurant.findById(restaurantId);

      if (!restaurant) {
        sendError(res, 'RESTAURANT_NOT_FOUND', 'Restaurant not found', null, 404);
        return;
      }

      let settings = await RestaurantSettings.findOne({ restaurantId: restaurant._id });
      if (!settings) {
        settings = new RestaurantSettings({ restaurantId: restaurant._id });
      }

      const activeFlags = await FeatureFlag.find({ restaurantId: restaurant._id, enabled: true }).select('key enabled');

      const responseData = {
        ...restaurant.toObject(),
        theme: settings.theme,
        currency: settings.currency,
        timezone: settings.timezone,
        taxRatePercent: settings.paymentConfig?.taxRatePercent || 0,
        paymentMethods: settings.paymentConfig?.paymentMethods || { cash: true, card: true, upi: true, razorpay: false },
        razorpayConfig: settings.paymentConfig?.razorpayConfig || { keyId: '', keySecret: '' },
        integrationConfig: settings.paymentConfig?.integrationConfig || { provider: 'NONE', config: {} },
        gstNumber: settings.paymentConfig?.gstNumber || '',
        orderWorkflowMode: settings.workflow?.orderWorkflowMode || 'FIVE_STEP',
        autoAcceptConfig: settings.workflow?.autoAcceptConfig || { enabled: false, delaySeconds: 10 },
        timings: settings.timings || { open: '09:00', close: '23:00' },
        googleReviewUrl: settings.branding?.googleReviewUrl || '',
        whatsapp: settings.branding?.whatsapp || '',
        socialLinks: settings.branding?.socialLinks || { facebook: '', instagram: '', twitter: '' },
        printerConfig: settings.printerConfig || { paperWidth: '80mm', receiptHeader: '', receiptFooter: '', defaultPrintTarget: 'BOTH' },
        featureFlags: activeFlags,
      };

      sendSuccess(res, responseData, 'Restaurant profile retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  async editRestaurantProfile(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { restaurantId } = req.params;
      const updateData = { ...req.body };

      // Prevent managers from editing system-only fields
      delete updateData.slug;
      delete updateData.isActive;

      // Validate orderWorkflowMode if provided
      if (updateData.orderWorkflowMode && !['FIVE_STEP', 'FOUR_STEP', 'THREE_STEP'].includes(updateData.orderWorkflowMode)) {
        sendError(res, 'BAD_REQUEST', 'Invalid orderWorkflowMode. Must be FIVE_STEP, FOUR_STEP, or THREE_STEP', null, 400);
        return;
      }

      // Validate autoAcceptConfig if provided
      if (updateData.autoAcceptConfig !== undefined) {
        const { enabled, delaySeconds } = updateData.autoAcceptConfig || {};
        if (typeof enabled !== 'boolean') {
          sendError(res, 'BAD_REQUEST', 'autoAcceptConfig.enabled must be a boolean', null, 400);
          return;
        }
        if (delaySeconds !== undefined && (typeof delaySeconds !== 'number' || delaySeconds < 1 || delaySeconds > 300)) {
          sendError(res, 'BAD_REQUEST', 'autoAcceptConfig.delaySeconds must be a number between 1 and 300', null, 400);
          return;
        }
      }

      const restaurant = await Restaurant.findByIdAndUpdate(restaurantId, updateData, { new: true });
      if (!restaurant) {
        sendError(res, 'RESTAURANT_NOT_FOUND', 'Restaurant not found', null, 404);
        return;
      }

      let settings = await RestaurantSettings.findOne({ restaurantId });
      if (!settings) {
        settings = new RestaurantSettings({ restaurantId });
      }

      if (updateData.theme) settings.theme = { ...settings.theme, ...updateData.theme };
      if (updateData.currency) settings.currency = updateData.currency;
      if (updateData.timezone) settings.timezone = updateData.timezone;
      if (updateData.taxRatePercent !== undefined) settings.paymentConfig.taxRatePercent = updateData.taxRatePercent;
      if (updateData.paymentMethods) settings.paymentConfig.paymentMethods = { ...settings.paymentConfig.paymentMethods, ...updateData.paymentMethods };
      if (updateData.razorpayConfig) settings.paymentConfig.razorpayConfig = { ...settings.paymentConfig.razorpayConfig, ...updateData.razorpayConfig };
      if (updateData.integrationConfig) settings.paymentConfig.integrationConfig = updateData.integrationConfig;
      if (updateData.gstNumber !== undefined) settings.paymentConfig.gstNumber = updateData.gstNumber;
      if (updateData.orderWorkflowMode) settings.workflow.orderWorkflowMode = updateData.orderWorkflowMode;
      if (updateData.autoAcceptConfig) settings.workflow.autoAcceptConfig = updateData.autoAcceptConfig;
      if (updateData.timings) settings.timings = updateData.timings;
      if (updateData.googleReviewUrl !== undefined) settings.branding.googleReviewUrl = updateData.googleReviewUrl;
      if (updateData.whatsapp !== undefined) settings.branding.whatsapp = updateData.whatsapp;
      if (updateData.socialLinks) settings.branding.socialLinks = { ...settings.branding.socialLinks, ...updateData.socialLinks };
      if (updateData.printerConfig) settings.printerConfig = { ...(settings.printerConfig || {}), ...updateData.printerConfig };

      await settings.save();

      const responseData = {
        ...restaurant.toObject(),
        theme: settings.theme,
        currency: settings.currency,
        timezone: settings.timezone,
        taxRatePercent: settings.paymentConfig?.taxRatePercent || 0,
        paymentMethods: settings.paymentConfig?.paymentMethods || { cash: true, card: true, upi: true, razorpay: false },
        razorpayConfig: settings.paymentConfig?.razorpayConfig || { keyId: '', keySecret: '' },
        integrationConfig: settings.paymentConfig?.integrationConfig || { provider: 'NONE', config: {} },
        gstNumber: settings.paymentConfig?.gstNumber || '',
        orderWorkflowMode: settings.workflow?.orderWorkflowMode || 'FIVE_STEP',
        autoAcceptConfig: settings.workflow?.autoAcceptConfig || { enabled: false, delaySeconds: 10 },
        timings: settings.timings || { open: '09:00', close: '23:00' },
        googleReviewUrl: settings.branding?.googleReviewUrl || '',
        whatsapp: settings.branding?.whatsapp || '',
        socialLinks: settings.branding?.socialLinks || { facebook: '', instagram: '', twitter: '' },
        printerConfig: settings.printerConfig || { paperWidth: '80mm', receiptHeader: '', receiptFooter: '', defaultPrintTarget: 'BOTH' },
      };

      sendSuccess(res, responseData, 'Restaurant profile updated successfully');
    } catch (error) {
      next(error);
    }
  }

  async listTables(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { restaurantId } = req.params;
      const tables = await Table.find({ restaurantId: new mongoose.Types.ObjectId(restaurantId), isArchived: { $ne: true } }).sort({ tableNumber: 1 }).populate("zoneId");

      const tableIds = tables.map((t) => t._id);

      const activeSessions = await DiningSession.find({
        restaurantId: new mongoose.Types.ObjectId(restaurantId),
        status: { $in: ['ACTIVE', 'BILL_REQUESTED'] },
      });

      const sessionMap = new Map(activeSessions.map((s) => [s.tableId.toString(), s]));

      const Order = mongoose.model('Order');
      const activeOrders = await Order.aggregate([
        {
          $match: {
            restaurantId: new mongoose.Types.ObjectId(restaurantId),
            tableId: { $in: tableIds },
            status: { $in: ['PENDING', 'ACCEPTED', 'PREPARING', 'READY', 'SERVED'] },
            paymentStatus: { $ne: 'PAID' },
          },
        },
        {
          $group: {
            _id: '$tableId',
            count: { $sum: 1 },
          },
        },
      ]);

      const orderCountMap = new Map(activeOrders.map((o: any) => [o._id.toString(), o.count]));

      const tablesWithSession = tables.map((t) => {
        const tableObj = t.toObject();
        const activeSession = sessionMap.get(t._id.toString());
        const activeOrderCount = orderCountMap.get(t._id.toString()) || 0;

        let computedStatus = t.status || 'AVAILABLE';
        if (activeOrderCount > 0 || activeSession) {
          if (computedStatus !== 'RESERVED') {
            computedStatus = 'OCCUPIED';
          }
        }

        return {
          ...tableObj,
          status: computedStatus,
          activeSession: activeSession || null,
          activeOrderCount,
        };
      });

      sendSuccess(res, tablesWithSession, 'Tables listed successfully');
    } catch (error) {
      next(error);
    }
  }

  async updateTableStatus(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { restaurantId, tableId } = req.params;
      const { status } = req.body;

      if (!status || !['AVAILABLE', 'OCCUPIED', 'RESERVED'].includes(status)) {
        sendError(res, 'BAD_REQUEST', 'Status must be AVAILABLE, OCCUPIED, or RESERVED', null, 400);
        return;
      }

      const table = await Table.findOne({ _id: tableId, restaurantId: new mongoose.Types.ObjectId(restaurantId) });
      if (!table) {
        sendError(res, 'TABLE_NOT_FOUND', 'Table not found', null, 404);
        return;
      }

      table.status = status;
      await table.save();

      // If clearing table to AVAILABLE, close any active dining session for this table
      if (status === 'AVAILABLE') {
        const activeSession = await DiningSession.findOne({
          restaurantId: new mongoose.Types.ObjectId(restaurantId),
          tableId: table._id,
          status: { $in: ['ACTIVE', 'BILL_REQUESTED'] },
        });
        if (activeSession) {
          await diningSessionService.closeSession(restaurantId, activeSession._id, req.user?.id);
        }
      }

      sendSuccess(res, table, `Table status updated to ${status}`);
    } catch (error) {
      next(error);
    }
  }

  async clearTables(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { restaurantId } = req.params;
      const { tableIds } = req.body;

      if (!Array.isArray(tableIds) || tableIds.length === 0) {
        sendError(res, 'BAD_REQUEST', 'tableIds must be a non-empty array', null, 400);
        return;
      }

      const objectIds = tableIds.map((id: string) => new mongoose.Types.ObjectId(id));

      // Update table statuses to AVAILABLE
      await Table.updateMany(
        { _id: { $in: objectIds }, restaurantId: new mongoose.Types.ObjectId(restaurantId) },
        { $set: { status: 'AVAILABLE' } }
      );

      // Close all active dining sessions for these tables
      const activeSessions = await DiningSession.find({
        restaurantId: new mongoose.Types.ObjectId(restaurantId),
        tableId: { $in: objectIds },
        status: { $in: ['ACTIVE', 'BILL_REQUESTED'] },
      });

      for (const session of activeSessions) {
        await diningSessionService.closeSession(restaurantId, session._id, req.user?.id);
      }

      // Also clear all non-cancelled orders for these tables
      await Order.updateMany(
        {
          restaurantId: new mongoose.Types.ObjectId(restaurantId),
          tableId: { $in: objectIds },
          status: { $ne: 'CANCELLED' },
        },
        {
          $set: {
            isCleared: true,
            clearedAt: new Date(),
            paymentStatus: 'PAID',
          },
        }
      );

      // Broadcast table cleared to all connected customer tables and restaurant staff
      const clearedTables = await Table.find({ _id: { $in: objectIds } }).select('token').lean();
      for (const tbl of clearedTables) {
        if (tbl?.token) {
          NotificationService.getInstance().notifyTableCleared(tbl.token);
        }
      }

      sendSuccess(res, { clearedCount: tableIds.length }, `${tableIds.length} table(s) cleared successfully`);
    } catch (error) {
      next(error);
    }
  }

  async reserveTables(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { restaurantId } = req.params;
      const { tableIds, reserved = true } = req.body;

      if (!Array.isArray(tableIds) || tableIds.length === 0) {
        sendError(res, 'BAD_REQUEST', 'tableIds must be a non-empty array', null, 400);
        return;
      }

      const objectIds = tableIds.map((id: string) => new mongoose.Types.ObjectId(id));
      const newStatus = reserved ? 'RESERVED' : 'AVAILABLE';

      await Table.updateMany(
        { _id: { $in: objectIds }, restaurantId: new mongoose.Types.ObjectId(restaurantId) },
        { $set: { status: newStatus } }
      );

      sendSuccess(res, { updatedCount: tableIds.length, status: newStatus }, `${tableIds.length} table(s) marked as ${newStatus}`);
    } catch (error) {
      next(error);
    }
  }

  async createTable(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { restaurantId } = req.params;
      const { zoneId } = req.body;
      let { tableNumber, displayName } = req.body;

      const restaurant = await Restaurant.findById(restaurantId);
      if (!restaurant) {
        sendError(res, 'RESTAURANT_NOT_FOUND', 'Restaurant not found', null, 404);
        return;
      }

      const parsedZoneId = zoneId ? new mongoose.Types.ObjectId(zoneId) : undefined;

      // Auto-generate sequential tableNumber if not explicitly provided
      if (!tableNumber) {
        const queryFilter: any = {
          restaurantId: restaurant.id,
          isArchived: { $ne: true },
        };
        if (parsedZoneId) {
          queryFilter.zoneId = parsedZoneId;
        } else {
          queryFilter.$or = [{ zoneId: { $exists: false } }, { zoneId: null }];
        }

        const existingTables = await Table.find(queryFilter);
        let maxNum = 0;
        for (const t of existingTables) {
          const num = parseInt(t.tableNumber, 10);
          if (!isNaN(num) && num > maxNum) {
            maxNum = num;
          }
        }
        tableNumber = (maxNum + 1).toString();
      } else {
        tableNumber = tableNumber.trim();
      }

      if (!displayName) {
        displayName = `Table ${tableNumber}`;
      } else {
        displayName = displayName.trim();
      }

      // Check duplicate tableNumber within the same zone
      const duplicateFilter: any = {
        isArchived: { $ne: true },
        restaurantId: restaurant.id,
        tableNumber,
      };
      if (parsedZoneId) {
        duplicateFilter.zoneId = parsedZoneId;
      } else {
        duplicateFilter.$or = [{ zoneId: { $exists: false } }, { zoneId: null }];
      }

      const duplicate = await Table.findOne(duplicateFilter);
      if (duplicate) {
        sendError(res, 'DUPLICATE_TABLE_NUMBER', `Table number ${tableNumber} already exists in this zone`, null, 400);
        return;
      }

      const token = tableService.generateSecureToken();
      const qrCodeUrl = `/api/v1/restaurants/${restaurant.id}/tables/${token}/qr`;

      const table = new Table({
        restaurantId: restaurant.id,
        tableNumber,
        displayName,
        zoneId: parsedZoneId,
        token,
        qrCodeUrl,
        isActive: true,
      });

      await table.save();
      await restaurantStatsService.incrementTables(restaurantId, 1);

      sendSuccess(res, table, 'Table created successfully', 201);
    } catch (error) {
      next(error);
    }
  }

  async bulkCreateTables(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    const isTestEnv = config.app.isTest;
    let session;

    // Transactions are heavily reliant on replica sets in MongoDB, which in-memory mock setups often lack.
    // Skip real transaction bounds during tests to prevent "Transaction numbers are only allowed on a replica set" errors
    if (!isTestEnv) {
      session = await mongoose.startSession();
      session.startTransaction();
    }

    try {
      const { restaurantId } = req.params;
      const { count, prefix, zoneId } = req.body;

      if (!count || count <= 0 || count > 100) {
        sendError(res, 'BAD_REQUEST', 'Count must be between 1 and 100', null, 400);
        return;
      }

      const restaurant = await Restaurant.findById(restaurantId);
      if (session) {
        restaurant?.$session(session);
      }

      if (!restaurant) {
        sendError(res, 'RESTAURANT_NOT_FOUND', 'Restaurant not found', null, 404);
        return;
      }

      const parsedZoneId = zoneId ? new mongoose.Types.ObjectId(zoneId) : undefined;
      const sanitizedPrefix = prefix ? prefix.trim() : '';

      // Determine next available number based on prefix and zone
      const queryFilter: any = {
        restaurantId: restaurant.id,
        isArchived: { $ne: true },
      };
      if (parsedZoneId) {
        queryFilter.zoneId = parsedZoneId;
      } else {
        queryFilter.$or = [{ zoneId: { $exists: false } }, { zoneId: null }];
      }

      // If a prefix is provided, we only want to look at tables starting with that prefix
      // If no prefix is provided, we look at ALL tables in the zone without a prefix or with any format,
      // but to be safe and simple, let's just grab all and parse carefully.
      let query = Table.find(queryFilter);
      if (session) {
        query = query.session(session);
      }
      const existingTables = await query;

      let maxNum = 0;
      for (const t of existingTables) {
        let numStr = t.tableNumber;
        if (sanitizedPrefix && numStr.startsWith(sanitizedPrefix)) {
          numStr = numStr.slice(sanitizedPrefix.length);
        } else if (sanitizedPrefix && !numStr.startsWith(sanitizedPrefix)) {
           continue; // Skip tables that don't match our prefix logic
        }

        const num = parseInt(numStr, 10);
        if (!isNaN(num) && num > maxNum) {
          maxNum = num;
        }
      }

      const tablesToCreate = [];
      let startingNum = maxNum + 1;

      for (let i = 0; i < count; i++) {
        const tableNumber = `${sanitizedPrefix}${startingNum}`;
        const displayName = `Table ${tableNumber}`;
        const token = tableService.generateSecureToken();
        const qrCodeUrl = `/api/v1/restaurants/${restaurant.id}/tables/${token}/qr`;

        tablesToCreate.push({
          restaurantId: restaurant.id,
          tableNumber,
          displayName,
          zoneId: parsedZoneId,
          token,
          qrCodeUrl,
          isActive: true,
        });

        startingNum++;
      }

      if (session) {
        await Table.insertMany(tablesToCreate, { session });
      } else {
        await Table.insertMany(tablesToCreate);
      }
      await restaurantStatsService.incrementTables(restaurantId, count);

      if (session) {
        await session.commitTransaction();
        session.endSession();
      }

      sendSuccess(res, { count }, `${count} tables created successfully`, 201);
    } catch (error) {
      if (session) {
        await session.abortTransaction();
        session.endSession();
      }
      next(error);
    }
  }

  async editTable(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { restaurantId, tableId } = req.params;
      const { tableNumber, displayName, isActive } = req.body;

      const table = await Table.findOne({ _id: tableId, restaurantId });
      if (!table) {
        sendError(res, 'TABLE_NOT_FOUND', 'Table not found', null, 404);
        return;
      }

      const targetZoneId = req.body.zoneId !== undefined
        ? (req.body.zoneId ? new mongoose.Types.ObjectId(req.body.zoneId) : undefined)
        : table.zoneId;

      if (tableNumber && tableNumber.trim() !== table.tableNumber) {
        // Check duplicates within the zone
        const duplicateFilter: any = {
          isArchived: { $ne: true },
          restaurantId,
          tableNumber: tableNumber.trim(),
          _id: { $ne: tableId },
        };
        if (targetZoneId) {
          duplicateFilter.zoneId = targetZoneId;
        } else {
          duplicateFilter.$or = [{ zoneId: { $exists: false } }, { zoneId: null }];
        }

        const duplicate = await Table.findOne(duplicateFilter);
        if (duplicate) {
          sendError(res, 'DUPLICATE_TABLE_NUMBER', 'Table number already exists in this zone', null, 400);
          return;
        }
        table.tableNumber = tableNumber.trim();
      }

      if (displayName) {
        table.displayName = displayName.trim();
      }

      if (isActive !== undefined) {
        table.isActive = !!isActive;
      }

      if (req.body.zoneId !== undefined) {
          table.zoneId = req.body.zoneId ? new mongoose.Types.ObjectId(req.body.zoneId) : undefined;
      }

      await table.save();

      sendSuccess(res, table, 'Table updated successfully');
    } catch (error) {
      next(error);
    }
  }

  async deleteTable(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { restaurantId, tableId } = req.params;
      const orderCount = await mongoose.model('Order').countDocuments({ tableId });

      let table;
      let archived = false;
      if (orderCount > 0) {
        table = await Table.findOneAndUpdate(
          { _id: tableId, restaurantId },
          { isArchived: true, isActive: false },
          { new: true }
        );
        archived = true;
      } else {
        table = await Table.findOneAndDelete({ _id: tableId, restaurantId });
      }

      if (!table) {
        sendError(res, 'TABLE_NOT_FOUND', 'Table not found', null, 404);
        return;
      }

      await restaurantStatsService.incrementTables(restaurantId, -1);

      sendSuccess(res, { archived }, 'Table deleted successfully');
    } catch (error) {
      next(error);
    }
  }

  async activateTable(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { restaurantId, tableId } = req.params;
      const table = await Table.findOneAndUpdate({ _id: tableId, restaurantId }, { isActive: true }, { new: true });

      if (!table) {
        sendError(res, 'TABLE_NOT_FOUND', 'Table not found', null, 404);
        return;
      }

      sendSuccess(res, table, 'Table activated successfully');
    } catch (error) {
      next(error);
    }
  }

  async deactivateTable(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { restaurantId, tableId } = req.params;
      const table = await Table.findOneAndUpdate({ _id: tableId, restaurantId }, { isActive: false }, { new: true });

      if (!table) {
        sendError(res, 'TABLE_NOT_FOUND', 'Table not found', null, 404);
        return;
      }

      sendSuccess(res, table, 'Table deactivated successfully');
    } catch (error) {
      next(error);
    }
  }

  async regenerateTableQr(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { restaurantId, tableId } = req.params;

      const restaurant = await Restaurant.findById(restaurantId);
      if (!restaurant) {
        sendError(res, 'RESTAURANT_NOT_FOUND', 'Restaurant not found', null, 404);
        return;
      }

      const table = await Table.findOne({ _id: tableId, restaurantId: restaurant.id });
      if (!table) {
        sendError(res, 'TABLE_NOT_FOUND', 'Table not found', null, 404);
        return;
      }

      // Rotate token and invalidate old one
      const newToken = tableService.generateSecureToken();
      table.token = newToken;
      table.qrCodeUrl = `/api/v1/restaurants/${restaurant.id}/tables/${newToken}/qr`;

      await table.save();

      sendSuccess(res, table, 'QR code and table token regenerated successfully');
    } catch (error) {
      next(error);
    }
  }

  async getTableQr(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { restaurantId, tableId } = req.params;

      const restaurant = await Restaurant.findById(restaurantId);
      if (!restaurant) {
        sendError(res, 'RESTAURANT_NOT_FOUND', 'Restaurant not found', null, 404);
        return;
      }

      // tableId in parameters could actually be the table ID or the token. Support finding by either to make it highly robust
      let table = await Table.findOne({ _id: mongoose.Types.ObjectId.isValid(tableId) ? tableId : undefined, restaurantId: restaurant.id });
      if (!table) {
        table = await Table.findOne({ token: tableId, restaurantId: restaurant.id });
      }

      if (!table) {
        sendError(res, 'TABLE_NOT_FOUND', 'Table not found', null, 404);
        return;
      }

      const clientUrl = config.app.clientUrl;
      const tableUrl = `${clientUrl}/r/${restaurant.slug}/t/${table.token}`;

      const svg = await tableService.generateQrCodeSvg(tableUrl);
      const pngDataUri = await tableService.generateQrCodePngDataUri(tableUrl);

      sendSuccess(res, { svg, pngDataUri, url: tableUrl }, 'QR retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  // ==========================================
  // TABLE ZONES MANAGEMENT
  // ==========================================

  async listZones(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { restaurantId } = req.params;
      const zones = await TableZone.find({ restaurantId: new mongoose.Types.ObjectId(restaurantId) }).sort({ name: 1 });
      sendSuccess(res, zones, 'Zones fetched successfully');
    } catch (error) {
      next(error);
    }
  }

  async createZone(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { restaurantId } = req.params;
      const { name } = req.body;

      if (!name) {
        sendError(res, 'BAD_REQUEST', 'Zone name is required', null, 400);
        return;
      }

      const existingZone = await TableZone.findOne({ restaurantId: new mongoose.Types.ObjectId(restaurantId), name: name.trim() });
      if (existingZone) {
        sendError(res, 'CONFLICT', 'Zone with this name already exists', null, 409);
        return;
      }

      const zone = new TableZone({
        restaurantId: new mongoose.Types.ObjectId(restaurantId),
        name: name.trim(),
        isActive: true,
      });

      await zone.save();
      sendSuccess(res, zone, 'Zone created successfully', 201);
    } catch (error) {
      next(error);
    }
  }

  async updateZone(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { restaurantId, zoneId } = req.params;
      const { name, isActive } = req.body;

      const zone = await TableZone.findOne({ _id: zoneId, restaurantId: new mongoose.Types.ObjectId(restaurantId) });
      if (!zone) {
        sendError(res, 'NOT_FOUND', 'Zone not found', null, 404);
        return;
      }

      if (name) zone.name = name.trim();
      if (isActive !== undefined) zone.isActive = !!isActive;

      await zone.save();
      sendSuccess(res, zone, 'Zone updated successfully');
    } catch (error) {
      next(error);
    }
  }

  async deleteZone(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { restaurantId, zoneId } = req.params;

      const zone = await TableZone.findOneAndDelete({ _id: zoneId, restaurantId: new mongoose.Types.ObjectId(restaurantId) });
      if (!zone) {
        sendError(res, 'NOT_FOUND', 'Zone not found', null, 404);
        return;
      }

      // Hard delete all tables in this zone as per user request
      await Table.deleteMany({ restaurantId: new mongoose.Types.ObjectId(restaurantId), zoneId: new mongoose.Types.ObjectId(zoneId) });

      sendSuccess(res, {}, 'Zone and associated tables deleted successfully');
    } catch (error) {
      next(error);
    }
  }

  // ==========================================
  // TAXES MANAGEMENT
  // ==========================================

  async listTaxes(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { restaurantId } = req.params;
      const taxes = await Tax.find({ restaurantId: new mongoose.Types.ObjectId(restaurantId) }).sort({ createdAt: 1 });
      sendSuccess(res, taxes, 'Taxes fetched successfully');
    } catch (error) {
      next(error);
    }
  }

  async createTax(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { restaurantId } = req.params;
      const { name, percentage, type, groupId } = req.body;

      if (!name) {
        sendError(res, 'BAD_REQUEST', 'Tax name is required', null, 400);
        return;
      }

      if (type === 'TAX' && typeof percentage !== 'number') {
        sendError(res, 'BAD_REQUEST', 'Tax percentage is required for regular taxes', null, 400);
        return;
      }

      const tax = new Tax({
        restaurantId: new mongoose.Types.ObjectId(restaurantId),
        type: type || 'TAX',
        groupId: groupId ? new mongoose.Types.ObjectId(groupId) : undefined,
        name: name.trim(),
        percentage: type === 'GROUP' ? 0 : percentage,
        isActive: true,
      });

      await tax.save();
      sendSuccess(res, tax, 'Tax created successfully', 201);
    } catch (error) {
      next(error);
    }
  }

  async updateTax(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { restaurantId, taxId } = req.params;
      const { name, percentage, isActive, type, groupId } = req.body;

      const tax = await Tax.findOne({ _id: taxId, restaurantId: new mongoose.Types.ObjectId(restaurantId) });
      if (!tax) {
        sendError(res, 'NOT_FOUND', 'Tax not found', null, 404);
        return;
      }

      if (name) tax.name = name.trim();
      if (percentage !== undefined && tax.type !== 'GROUP') tax.percentage = percentage;
      if (isActive !== undefined) tax.isActive = !!isActive;
      if (type !== undefined) {
         tax.type = type;
         if (type === 'GROUP') tax.percentage = 0;
      }
      if (groupId !== undefined) tax.groupId = groupId ? new mongoose.Types.ObjectId(groupId) : undefined;

      await tax.save();
      sendSuccess(res, tax, 'Tax updated successfully');
    } catch (error) {
      next(error);
    }
  }

  async deleteTax(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { restaurantId, taxId } = req.params;

      const tax = await Tax.findOneAndDelete({ _id: taxId, restaurantId: new mongoose.Types.ObjectId(restaurantId) });
      if (!tax) {
        sendError(res, 'NOT_FOUND', 'Tax not found', null, 404);
        return;
      }

      sendSuccess(res, {}, 'Tax deleted successfully');
    } catch (error) {
      next(error);
    }
  }

  async listCustomers(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { restaurantId } = req.params;
      const search = req.query.search as string;
      const page = parseInt(req.query.page as string, 10) || 1;
      const limit = parseInt(req.query.limit as string, 10) || 50;

      const result = await customerService.listRestaurantCustomers(restaurantId, search, page, limit);
      sendSuccess(res, result, 'Customers retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  async getCustomerDetails(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { restaurantId, customerId } = req.params;
      const result = await customerService.getCustomerDetails(restaurantId, customerId);
      sendSuccess(res, result, 'Customer details retrieved successfully');
    } catch (error) {
      next(error);
    }
  }
}
export default RestaurantController;
