import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
import { pushNotificationService } from '../services/pushNotification.service';
import { sendSuccess, sendError } from '../utils/response';
import { restaurantStaffRepository } from '../repositories/restaurantStaff.repository';

export class NotificationController {
  constructor() {
    this.registerDevice = this.registerDevice.bind(this);
    this.unregisterDevice = this.unregisterDevice.bind(this);
    this.testPushNotification = this.testPushNotification.bind(this);
  }

  async registerDevice(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        sendError(res, 'UNAUTHORIZED', 'Authentication required', null, 401);
        return;
      }

      const { token, platform, restaurantId, deviceModel, appVersion } = req.body;

      if (!token || typeof token !== 'string' || token.trim().length === 0) {
        sendError(res, 'VALIDATION_ERROR', 'Device token is required', null, 400);
        return;
      }

      let targetRestaurantId = restaurantId;

      // If restaurantId is not provided, resolve from user's active/assigned restaurant
      if (!targetRestaurantId) {
        const staffRecords = await restaurantStaffRepository.findByUserId(req.user.id);
        const staff = staffRecords.find(s => s.isActive);
        if (staff) {
          targetRestaurantId = staff.restaurantId.toString();
        }
      }

      if (!targetRestaurantId) {
        sendError(res, 'VALIDATION_ERROR', 'Restaurant ID is required for device registration', null, 400);
        return;
      }

      const device = await pushNotificationService.registerDevice(
        req.user.id,
        targetRestaurantId,
        token.trim(),
        platform === 'ios' ? 'ios' : platform === 'web' ? 'web' : 'android',
        deviceModel,
        appVersion
      );

      sendSuccess(res, { deviceId: device.id, registered: true }, 'Device registered for push notifications');
    } catch (error) {
      next(error);
    }
  }

  async unregisterDevice(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { token } = req.body;
      if (token && typeof token === 'string') {
        await pushNotificationService.unregisterDevice(token);
      }
      sendSuccess(res, { unregistered: true }, 'Device unregistered from push notifications');
    } catch (error) {
      next(error);
    }
  }

  async testPushNotification(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        sendError(res, 'UNAUTHORIZED', 'Authentication required', null, 401);
        return;
      }

      const { token, title, body } = req.body;

      const payload = {
        title: title || '🛎️ ScanMenu Test Notification',
        body: body || 'Test floor notification successfully delivered to your device!',
        channelId: 'scanmenu_alerts_channel',
        sound: 'order_alert',
        data: {
          type: 'TEST_NOTIFICATION',
          timestamp: new Date().toISOString(),
        },
      };

      if (token) {
        const sent = await pushNotificationService.sendToToken(token, payload);
        sendSuccess(res, { sent }, sent ? 'Test notification sent' : 'Failed to send test notification');
      } else {
        await pushNotificationService.sendToUser(req.user.id, payload);
        sendSuccess(res, { sent: true }, 'Test notification dispatched to user devices');
      }
    } catch (error) {
      next(error);
    }
  }
}

export const notificationController = new NotificationController();
export default NotificationController;
