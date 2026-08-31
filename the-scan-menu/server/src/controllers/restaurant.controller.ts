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
import { loyaltyService } from '../services/loyalty.service';
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
    this.transferTable = this.transferTable.bind(this);
    this.mergeTables = this.mergeTables.bind(this);

    // Waiter Staff Management
    this.createStaff = this.createStaff.bind(this);
    this.createTax = this.createTax.bind(this);
    this.updateTax = this.updateTax.bind(this);
    this.deleteTax = this.deleteTax.bind(this);
    this.listCustomers = this.listCustomers.bind(this);
    this.getCustomerDetails = this.getCustomerDetails.bind(this);
    this.getLoyaltyInfo = this.getLoyaltyInfo.bind(this);
    this.adjustLoyaltyPoints = this.adjustLoyaltyPoints.bind(this);
    this.getCustomerLoyaltyLedger = this.getCustomerLoyaltyLedger.bind(this);
    this.getLoyaltyLeaderboard = this.getLoyaltyLeaderboard.bind(this);
    this.getLoyaltyConfig = this.getLoyaltyConfig.bind(this);
    this.updateLoyaltyConfig = this.updateLoyaltyConfig.bind(this);
    this.listStaff = this.listStaff.bind(this);
    this.updateStaff = this.updateStaff.bind(this);
    this.deleteStaff = this.deleteStaff.bind(this);

    // POS PIN Authentication
    this.unlockPosByPin = this.unlockPosByPin.bind(this);
    this.verifyManagerPin = this.verifyManagerPin.bind(this);
  }

  async createStaff(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { restaurantId } = req.params;
      const { email, name, password, pin, role = 'STAFF' } = req.body;

      if (!email || !name || !password) {
        sendError(res, 'BAD_REQUEST', 'Email, name, and password are required', null, 400);
        return;
      }

      const assignedRole = role === 'MANAGER' ? 'MANAGER' : 'STAFF';

      // Check if user already exists
      const existingUser = await User.findOne({ email: email.toLowerCase().trim() });
      if (existingUser) {
        const existingJoin = await RestaurantStaff.findOne({
          userId: existingUser._id,
          restaurantId: new mongoose.Types.ObjectId(restaurantId),
        });
        if (existingJoin) {
          if (!existingJoin.isActive) {
            existingJoin.isActive = true;
            existingJoin.role = assignedRole;
            await existingJoin.save();
            existingUser.isActive = true;
            existingUser.role = assignedRole;
            await existingUser.save();
            sendSuccess(res, { id: existingUser._id, email: existingUser.email, name: existingUser.name, role: existingUser.role, pin: existingUser.pin }, 'Member reactivated successfully', 200);
            return;
          }
          sendError(res, 'USER_ALREADY_EXISTS', 'A user with this email is already a member of this restaurant', null, 400);
          return;
        }

        const staffJoin = new RestaurantStaff({
          userId: existingUser._id,
          restaurantId: new mongoose.Types.ObjectId(restaurantId),
          role: assignedRole,
          isActive: true,
        });
        await staffJoin.save();
        await restaurantStatsService.incrementStaff(restaurantId, 1);
        sendSuccess(res, { id: existingUser._id, email: existingUser.email, name: existingUser.name, role: assignedRole, pin: existingUser.pin }, 'Member associated successfully', 201);
        return;
      }

      const passwordHash = await bcrypt.hash(password, 10);
      const staffUser = new User({
        email: email.toLowerCase().trim(),
        passwordHash,
        name: name.trim(),
        role: assignedRole,
        restaurantId: new mongoose.Types.ObjectId(restaurantId),
        isActive: true,
        pin: pin ? pin.trim() : undefined,
      });

      await staffUser.save();

      // Create RestaurantStaff row
      const staffJoin = new RestaurantStaff({
        userId: staffUser._id,
        restaurantId: new mongoose.Types.ObjectId(restaurantId),
        role: assignedRole,
        isActive: true,
      });
      await staffJoin.save();
      await restaurantStatsService.incrementStaff(restaurantId, 1);

      sendSuccess(res, { id: staffUser._id, email: staffUser.email, name: staffUser.name, role: staffUser.role, pin: staffUser.pin }, 'Member created and associated successfully', 201);
    } catch (error) {
      next(error);
    }
  }

  async listStaff(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { restaurantId } = req.params;
      const restObjId = new mongoose.Types.ObjectId(restaurantId);

      // Fetch all RestaurantStaff entries (both MANAGER and STAFF)
      const staffJoins = await RestaurantStaff.find({
        restaurantId: restObjId,
      }).populate('userId');

      // Also fetch direct Users tied to this restaurantId
      const directUsers = await User.find({
        restaurantId: restObjId,
        role: { $in: ['MANAGER', 'STAFF'] },
      });

      const userMap = new Map<string, any>();

      staffJoins.forEach((j: any) => {
        if (j.userId && j.userId._id) {
          const u = j.userId.toObject ? j.userId.toObject() : j.userId;
          userMap.set(u._id.toString(), {
            _id: u._id,
            name: u.name,
            email: u.email,
            role: j.role || u.role,
            pin: u.pin,
            isActive: j.isActive !== false && u.isActive !== false,
            createdAt: u.createdAt,
            updatedAt: u.updatedAt,
          });
        }
      });

      directUsers.forEach((u: any) => {
        const idStr = u._id.toString();
        if (!userMap.has(idStr)) {
          userMap.set(idStr, {
            _id: u._id,
            name: u.name,
            email: u.email,
            role: u.role,
            pin: u.pin,
            isActive: u.isActive !== false,
            createdAt: u.createdAt,
            updatedAt: u.updatedAt,
          });
        }
      });

      const allMembers = Array.from(userMap.values());
      sendSuccess(res, allMembers, 'Staff & Manager roster listed successfully');
    } catch (error) {
      next(error);
    }
  }

  async updateStaff(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { restaurantId, staffId } = req.params;
      const { name, email, password, pin, role, isActive } = req.body;

      const staffJoin = await RestaurantStaff.findOne({
        userId: new mongoose.Types.ObjectId(staffId),
        restaurantId: new mongoose.Types.ObjectId(restaurantId),
      });

      const user = await User.findById(staffId);
      if (!user) {
        sendError(res, 'USER_NOT_FOUND', 'User not found', null, 404);
        return;
      }

      if (email && email.toLowerCase().trim() !== user.email) {
        const existing = await User.findOne({ email: email.toLowerCase().trim(), _id: { $ne: staffId } });
        if (existing) {
          sendError(res, 'USER_ALREADY_EXISTS', 'Email already in use', null, 400);
          return;
        }
        user.email = email.toLowerCase().trim();
      }

      if (name) user.name = name.trim();
      if (password) user.passwordHash = await bcrypt.hash(password, 10);
      if (pin !== undefined) user.pin = pin ? pin.trim() : undefined;
      if (role && ['MANAGER', 'STAFF'].includes(role)) {
        user.role = role;
        if (staffJoin) staffJoin.role = role;
      }
      if (isActive !== undefined) {
        user.isActive = isActive;
        if (staffJoin) staffJoin.isActive = isActive;
      }

      await user.save();
      if (staffJoin) await staffJoin.save();

      sendSuccess(res, { id: user._id, email: user.email, name: user.name, role: user.role, pin: user.pin, isActive: user.isActive }, 'Member updated successfully');
    } catch (error) {
      next(error);
    }
  }

  async deleteStaff(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { restaurantId, staffId } = req.params;
      const staffObjId = new mongoose.Types.ObjectId(staffId);
      const restObjId = new mongoose.Types.ObjectId(restaurantId);

      // Deactivate RestaurantStaff link
      await RestaurantStaff.updateMany(
        { userId: staffObjId, restaurantId: restObjId },
        { $set: { isActive: false } }
      );

      // Deactivate the User account
      await User.findByIdAndUpdate(staffId, { isActive: false });
      await restaurantStatsService.incrementStaff(restaurantId, -1);

      sendSuccess(res, {}, 'Member deactivated / removed successfully');
    } catch (error) {
      next(error);
    }
  }

  async unlockPosByPin(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { restaurantId } = req.params;
      const { pin } = req.body;

      if (!pin || typeof pin !== 'string') {
        sendError(res, 'BAD_REQUEST', 'PIN is required', null, 400);
        return;
      }

      const cleanPin = pin.trim();
      const restObjId = new mongoose.Types.ObjectId(restaurantId);

      // 1. Check RestaurantStaff associations
      const staffJoins = await RestaurantStaff.find({
        restaurantId: restObjId,
        isActive: true,
      }).populate('userId');

      let matchedUser: any = null;
      let matchedRole: string = 'STAFF';

      for (const join of staffJoins) {
        const u = join.userId as any;
        if (u && u.isActive && u.pin && u.pin.trim() === cleanPin) {
          matchedUser = u;
          matchedRole = join.role || u.role;
          break;
        }
      }

      // 2. Check direct Users with restaurantId
      if (!matchedUser) {
        const directUser = await User.findOne({
          restaurantId: restObjId,
          pin: cleanPin,
          isActive: true,
        });
        if (directUser) {
          matchedUser = directUser;
          matchedRole = directUser.role;
        }
      }

      // 3. Check SuperAdmin PIN override
      if (!matchedUser && req.user?.role === 'SUPER_ADMIN') {
        const superAdmin = await User.findById(req.user.id);
        if (superAdmin && superAdmin.pin && superAdmin.pin.trim() === cleanPin) {
          matchedUser = superAdmin;
          matchedRole = 'SUPER_ADMIN';
        }
      }

      if (!matchedUser) {
        sendError(res, 'INVALID_PIN', 'Invalid POS PIN. Please try again or contact your manager.', null, 401);
        return;
      }

      const responsePayload = {
        id: matchedUser._id,
        name: matchedUser.name,
        email: matchedUser.email,
        role: matchedRole,
        unlockedAt: new Date().toISOString(),
      };

      sendSuccess(res, responsePayload, `POS unlocked successfully for ${matchedUser.name}`);
    } catch (error) {
      next(error);
    }
  }

  async verifyManagerPin(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { restaurantId } = req.params;
      const { pin, action = 'MANAGER_OVERRIDE' } = req.body;

      if (!pin || typeof pin !== 'string') {
        sendError(res, 'BAD_REQUEST', 'Manager PIN is required', null, 400);
        return;
      }

      const cleanPin = pin.trim();
      const restObjId = new mongoose.Types.ObjectId(restaurantId);

      // Check manager associations
      const managerJoins = await RestaurantStaff.find({
        restaurantId: restObjId,
        role: 'MANAGER',
        isActive: true,
      }).populate('userId');

      let verifiedManager: any = null;

      for (const join of managerJoins) {
        const u = join.userId as any;
        if (u && u.isActive && u.pin && u.pin.trim() === cleanPin) {
          verifiedManager = u;
          break;
        }
      }

      if (!verifiedManager) {
        const directManager = await User.findOne({
          restaurantId: restObjId,
          role: 'MANAGER',
          pin: cleanPin,
          isActive: true,
        });
        if (directManager) {
          verifiedManager = directManager;
        }
      }

      if (!verifiedManager) {
        const superAdmin = await User.findOne({
          role: 'SUPER_ADMIN',
          pin: cleanPin,
          isActive: true,
        });
        if (superAdmin) {
          verifiedManager = superAdmin;
        }
      }

      if (!verifiedManager) {
        sendError(res, 'UNAUTHORIZED_MANAGER_PIN', 'Invalid Manager PIN. Manager authorization required.', null, 403);
        return;
      }

      sendSuccess(
        res,
        {
          verified: true,
          managerId: verifiedManager._id,
          managerName: verifiedManager.name,
          action,
          authorizedAt: new Date().toISOString(),
        },
        'Manager override authorized'
      );
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
        fssaiNumber: settings.paymentConfig?.fssaiNumber || settings.printerConfig?.fssaiNumber || '',
        upiId: settings.paymentConfig?.upiId || settings.printerConfig?.upiId || '',
        preferredMethodOrder: settings.paymentConfig?.preferredMethodOrder || ['UPI', 'CASH', 'CARD', 'RAZORPAY'],
        orderWorkflowMode: settings.workflow?.orderWorkflowMode || 'FIVE_STEP',
        autoAcceptConfig: settings.workflow?.autoAcceptConfig || { enabled: false, delaySeconds: 10 },
        timings: settings.timings || { open: '09:00', close: '23:00' },
        googleReviewUrl: settings.branding?.googleReviewUrl || '',
        whatsapp: settings.branding?.whatsapp || '',
        socialLinks: settings.branding?.socialLinks || { facebook: '', instagram: '', twitter: '' },
        printerConfig: settings.printerConfig || { paperWidth: '80mm', receiptHeader: '', receiptFooter: '', defaultPrintTarget: 'BOTH' },
        paymentConfig: settings.paymentConfig,
        roundingConfig: settings.roundingConfig || { enabled: true, strategy: 'NEAREST' },
        activeMode: settings.paymentConfig?.activeMode || 'POSTPAID',
        qrCodeStyle: settings.qrCodeStyle,
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
      const isSuperAdmin = req.user?.role === 'SUPER_ADMIN';

      // Prevent non-superadmins from editing system-only fields
      delete updateData.slug;
      delete updateData.isActive;

      // Prevent managers from editing store identity & physical details (SuperAdmin only)
      if (!isSuperAdmin) {
        const attemptedStoreKeys = ['name', 'phone', 'email', 'address', 'description', 'gstNumber', 'fssaiNumber', 'timings', 'googleReviewUrl', 'whatsapp', 'logoUrl', 'coverImageUrl'];
        const hasStoreFields = attemptedStoreKeys.some((k) => updateData[k] !== undefined);
        
        attemptedStoreKeys.forEach((k) => delete updateData[k]);

        // If the manager sent ONLY store profile fields, reject with 403
        if (hasStoreFields && Object.keys(updateData).length === 0) {
          sendError(res, 'FORBIDDEN', 'Store profile, identity, and physical details can only be configured by SuperAdmin.', null, 403);
          return;
        }
      }

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

      // Validate active orders/sessions before allowing rounding configuration changes
      if (updateData.roundingConfig !== undefined) {
        const activeOrdersCount = await Order.countDocuments({
          restaurantId: new mongoose.Types.ObjectId(restaurantId),
          status: { $in: ['PENDING', 'ACCEPTED', 'PREPARING', 'READY', 'SERVED'] },
        });
        const activeSessionsCount = await DiningSession.countDocuments({
          restaurantId: new mongoose.Types.ObjectId(restaurantId),
          status: { $in: ['ACTIVE', 'BILL_REQUESTED'] },
        });

        if (activeOrdersCount > 0 || activeSessionsCount > 0) {
          sendError(
            res,
            'ACTIVE_ORDERS_EXIST',
            'Cannot modify bill rounding configuration while active dining sessions or open orders exist. Please settle or complete active orders first.',
            { activeOrdersCount, activeSessionsCount },
            400
          );
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
      if (updateData.activeMode) settings.paymentConfig.activeMode = updateData.activeMode;
      if (updateData.activeProvider) settings.paymentConfig.activeProvider = updateData.activeProvider;
      if (updateData.paymentConfig) settings.paymentConfig = { ...settings.paymentConfig, ...updateData.paymentConfig };
      if (updateData.roundingConfig) settings.roundingConfig = { ...(settings.roundingConfig || { enabled: true, strategy: 'NEAREST' }), ...updateData.roundingConfig };
      if (updateData.preferredMethodOrder) settings.paymentConfig.preferredMethodOrder = updateData.preferredMethodOrder;
      if (updateData.gstNumber !== undefined) settings.paymentConfig.gstNumber = updateData.gstNumber;
      if (updateData.fssaiNumber !== undefined) settings.paymentConfig.fssaiNumber = updateData.fssaiNumber;
      if (updateData.upiId !== undefined) settings.paymentConfig.upiId = updateData.upiId;
      if (updateData.orderWorkflowMode) settings.workflow.orderWorkflowMode = updateData.orderWorkflowMode;
      if (updateData.autoAcceptConfig) settings.workflow.autoAcceptConfig = updateData.autoAcceptConfig;
      if (updateData.timings) settings.timings = updateData.timings;
      if (updateData.googleReviewUrl !== undefined) settings.branding.googleReviewUrl = updateData.googleReviewUrl;
      if (updateData.whatsapp !== undefined) settings.branding.whatsapp = updateData.whatsapp;
      if (updateData.socialLinks) settings.branding.socialLinks = { ...settings.branding.socialLinks, ...updateData.socialLinks };
      if (updateData.printerConfig) settings.printerConfig = { ...(settings.printerConfig || {}), ...updateData.printerConfig };
      if (updateData.qrCodeStyle) settings.qrCodeStyle = { ...(settings.qrCodeStyle || {}), ...updateData.qrCodeStyle };

      // Strictly disable auto-accept in database if PREPAID mode is active
      if (settings.paymentConfig.activeMode === 'PREPAID') {
        settings.workflow.autoAcceptConfig.enabled = false;
      }

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
        fssaiNumber: settings.paymentConfig?.fssaiNumber || settings.printerConfig?.fssaiNumber || '',
        upiId: settings.paymentConfig?.upiId || settings.printerConfig?.upiId || '',
        preferredMethodOrder: settings.paymentConfig?.preferredMethodOrder || ['UPI', 'CASH', 'CARD', 'RAZORPAY'],
        orderWorkflowMode: settings.workflow?.orderWorkflowMode || 'FIVE_STEP',
        autoAcceptConfig: settings.workflow?.autoAcceptConfig || { enabled: false, delaySeconds: 10 },
        timings: settings.timings || { open: '09:00', close: '23:00' },
        googleReviewUrl: settings.branding?.googleReviewUrl || '',
        whatsapp: settings.branding?.whatsapp || '',
        socialLinks: settings.branding?.socialLinks || { facebook: '', instagram: '', twitter: '' },
        printerConfig: settings.printerConfig || { paperWidth: '80mm', receiptHeader: '', receiptFooter: '', defaultPrintTarget: 'BOTH' },
        paymentConfig: settings.paymentConfig,
        roundingConfig: settings.roundingConfig || { enabled: true, strategy: 'NEAREST' },
        activeMode: settings.paymentConfig?.activeMode || 'POSTPAID',
        activeProvider: settings.paymentConfig?.activeProvider || 'CASH',
        qrCodeStyle: settings.qrCodeStyle,
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

      tablesWithSession.sort((a, b) =>
        (a.tableNumber || '').localeCompare(b.tableNumber || '', undefined, { numeric: true, sensitivity: 'base' })
      );

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
            status: 'COMPLETED',
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

  async transferTable(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { restaurantId } = req.params;
      const { sourceTableId, targetTableId, reason } = req.body;

      if (!sourceTableId || !targetTableId) {
        sendError(res, 'BAD_REQUEST', 'sourceTableId and targetTableId are required', null, 400);
        return;
      }

      const result = await diningSessionService.transferTableSession(
        restaurantId,
        sourceTableId,
        targetTableId,
        reason,
        req.user?.id
      );

      sendSuccess(res, result, `Table transferred successfully from ${result.sourceTable.displayName || result.sourceTable.tableNumber} to ${result.targetTable.displayName || result.targetTable.tableNumber}`);
    } catch (error: any) {
      if (error.code && error.status) {
        sendError(res, error.code, error.message, error.details, error.status);
        return;
      }
      next(error);
    }
  }

  async mergeTables(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { restaurantId } = req.params;
      const { primaryTableId, secondaryTableIds } = req.body;

      if (!primaryTableId || !Array.isArray(secondaryTableIds) || secondaryTableIds.length === 0) {
        sendError(res, 'BAD_REQUEST', 'primaryTableId and non-empty secondaryTableIds array are required', null, 400);
        return;
      }

      const result = await diningSessionService.mergeTableSessions(
        restaurantId,
        primaryTableId,
        secondaryTableIds,
        req.user?.id
      );

      sendSuccess(res, result, `Successfully merged ${secondaryTableIds.length} table(s) into Table ${result.primaryTable.displayName || result.primaryTable.tableNumber}`);
    } catch (error: any) {
      if (error.code && error.status) {
        sendError(res, error.code, error.message, error.details, error.status);
        return;
      }
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

      const settings = await RestaurantSettings.findOne({ restaurantId: restaurant.id });
      const qrStyle = settings?.qrCodeStyle;
      const fgColor = (req.query.fgColor as string) || qrStyle?.fgColor || '#0F172A';
      const bgColor = (req.query.bgColor as string) || qrStyle?.bgColor || '#FFFFFF';

      const svg = await tableService.generateQrCodeSvg(tableUrl, { fgColor, bgColor });
      const pngDataUri = await tableService.generateQrCodePngDataUri(tableUrl, { fgColor, bgColor });

      sendSuccess(
        res,
        {
          svg,
          pngDataUri,
          url: tableUrl,
          tableNumber: table.tableNumber,
          displayName: table.displayName,
          restaurantName: restaurant.name,
          restaurantLogo: qrStyle?.logoUrl || settings?.branding?.logoUrl || restaurant.logoUrl || '',
          qrStyle: {
            fgColor,
            bgColor,
            showLogo: qrStyle?.showLogo !== false,
            logoUrl: qrStyle?.logoUrl || settings?.branding?.logoUrl || restaurant.logoUrl || '',
            cornerStyle: qrStyle?.cornerStyle || 'rounded',
            cardFrameText: qrStyle?.cardFrameText || 'Scan to View Menu & Order',
            templateTheme: qrStyle?.templateTheme || 'branded',
          },
        },
        'QR retrieved successfully'
      );
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

  async getLoyaltyInfo(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { restaurantId } = req.params;
      const phone = (req.query.phone as string) || '';

      if (!phone) {
        sendError(res, 'BAD_REQUEST', 'Customer phone number is required', null, 400);
        return;
      }

      const result = await loyaltyService.getCustomerLoyalty(restaurantId, phone);
      sendSuccess(res, result, 'Customer loyalty details retrieved');
    } catch (error) {
      next(error);
    }
  }

  async adjustLoyaltyPoints(req: AuthenticatedRequest, res: Response, _next: NextFunction): Promise<void> {
    try {
      const { restaurantId } = req.params;
      const { customerId, pointsDelta, reason } = req.body;

      if (!customerId || pointsDelta === undefined || typeof pointsDelta !== 'number') {
        sendError(res, 'BAD_REQUEST', 'customerId and numeric pointsDelta are required', null, 400);
        return;
      }

      const result = await loyaltyService.adjustPoints(
        restaurantId,
        customerId,
        pointsDelta,
        reason || 'Manual staff adjustment',
        req.user?.id
      );

      sendSuccess(res, result, `Loyalty points adjusted successfully by ${pointsDelta >= 0 ? '+' : ''}${pointsDelta} points`);
    } catch (error: any) {
      sendError(res, 'ADJUST_ERROR', error.message || 'Failed to adjust points', null, 400);
    }
  }

  async getCustomerLoyaltyLedger(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { restaurantId, customerId } = req.params;
      const ledger = await loyaltyService.getCustomerLedger(restaurantId, customerId);
      sendSuccess(res, ledger, 'Customer loyalty history retrieved');
    } catch (error) {
      next(error);
    }
  }

  async getLoyaltyLeaderboard(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { restaurantId } = req.params;
      const sortBy = (req.query.sortBy as 'points' | 'spend' | 'visits') || 'points';
      const limit = parseInt(req.query.limit as string, 10) || 20;

      const leaderboard = await loyaltyService.getLeaderboard(restaurantId, sortBy, limit);
      sendSuccess(res, leaderboard, 'Loyalty leaderboard retrieved');
    } catch (error) {
      next(error);
    }
  }

  async getLoyaltyConfig(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { restaurantId } = req.params;
      const config = await loyaltyService.getLoyaltyConfig(restaurantId);
      sendSuccess(res, config, 'Loyalty configuration retrieved');
    } catch (error) {
      next(error);
    }
  }

  async updateLoyaltyConfig(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { restaurantId } = req.params;
      const updatedConfig = await loyaltyService.updateLoyaltyConfig(restaurantId, req.body);
      sendSuccess(res, updatedConfig, 'Loyalty configuration updated successfully');
    } catch (error) {
      next(error);
    }
  }
}
export default RestaurantController;
