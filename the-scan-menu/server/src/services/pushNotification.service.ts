import fs from 'fs';
import path from 'path';
import { initializeApp, getApps, cert, applicationDefault, App } from 'firebase-admin/app';
import { getMessaging, Messaging, Message, MulticastMessage } from 'firebase-admin/messaging';
import config from '../config';
import { DeviceToken, IDeviceToken } from '../models/DeviceToken';
import { logger } from '../utils/logger';

export interface PushNotificationPayload {
  title: string;
  body: string;
  data?: Record<string, string>;
  channelId?: string;
  sound?: string;
  tag?: string;
}

export class PushNotificationService {
  private static instance: PushNotificationService;
  private app: App | null = null;
  private messaging: Messaging | null = null;
  private isInitialized = false;

  private constructor() {
    this.initFirebase();
  }

  public static getInstance(): PushNotificationService {
    if (!PushNotificationService.instance) {
      PushNotificationService.instance = new PushNotificationService();
    }
    return PushNotificationService.instance;
  }

  private initFirebase(): void {
    const existingApps = getApps();
    if (existingApps.length > 0) {
      this.app = existingApps[0];
      this.messaging = getMessaging(this.app);
      this.isInitialized = true;
      return;
    }

    try {
      const rawKey = config.firebase.serviceAccountKey;

      if (rawKey && rawKey.trim().length > 0) {
        let credentialObj: any;

        // Check if rawKey is a JSON string or file path
        if (rawKey.trim().startsWith('{')) {
          credentialObj = JSON.parse(rawKey);
        } else {
          const resolvedPath = path.resolve(process.cwd(), rawKey.trim());
          if (fs.existsSync(resolvedPath)) {
            const fileData = fs.readFileSync(resolvedPath, 'utf-8');
            credentialObj = JSON.parse(fileData);
          }
        }

        if (credentialObj) {
          this.app = initializeApp({
            credential: cert(credentialObj),
            projectId: config.firebase.projectId || credentialObj.project_id,
          });
          this.messaging = getMessaging(this.app);
          this.isInitialized = true;
          logger.info('[PushNotification] Firebase Admin initialized successfully via service account key.');
          return;
        }
      }

      // Check default application credentials
      if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
        this.app = initializeApp({
          credential: applicationDefault(),
          projectId: config.firebase.projectId,
        });
        this.messaging = getMessaging(this.app);
        this.isInitialized = true;
        logger.info('[PushNotification] Firebase Admin initialized via GOOGLE_APPLICATION_CREDENTIALS.');
        return;
      }

      logger.warn('[PushNotification] Firebase credentials not configured. Push notifications will operate in fallback mode (socket events will continue).');
      this.isInitialized = false;
    } catch (err) {
      logger.error(err, '[PushNotification] Failed to initialize Firebase Admin SDK');
      this.isInitialized = false;
    }
  }

  public async registerDevice(
    userId: string,
    restaurantId: string,
    token: string,
    platform: 'android' | 'ios' | 'web' = 'android',
    deviceModel?: string,
    appVersion?: string
  ): Promise<IDeviceToken> {
    const cleanToken = token.trim();
    const existing = await DeviceToken.findOneAndUpdate(
      { token: cleanToken },
      {
        userId,
        restaurantId,
        platform,
        deviceModel,
        appVersion,
        isActive: true,
        lastActiveAt: new Date(),
      },
      { upsert: true, new: true }
    );
    logger.info(`[PushNotification] Registered device token for user ${userId}, restaurant ${restaurantId}, platform ${platform}`);
    return existing;
  }

  public async unregisterDevice(token: string): Promise<void> {
    if (!token) return;
    await DeviceToken.findOneAndUpdate({ token: token.trim() }, { isActive: false });
    logger.info('[PushNotification] Unregistered device token.');
  }

  public async sendToRestaurant(restaurantId: string, payload: PushNotificationPayload): Promise<void> {
    try {
      const activeDevices = await DeviceToken.find({ restaurantId, isActive: true });
      if (activeDevices.length === 0) {
        logger.debug(`[PushNotification] No active devices found for restaurant ${restaurantId}`);
        return;
      }

      const tokens = activeDevices.map((d) => d.token);
      await this.sendMulticast(tokens, payload);
    } catch (err) {
      logger.error(err, `[PushNotification] Error sending push to restaurant ${restaurantId}`);
    }
  }

  public async sendToUser(userId: string, payload: PushNotificationPayload): Promise<void> {
    try {
      const activeDevices = await DeviceToken.find({ userId, isActive: true });
      if (activeDevices.length === 0) return;

      const tokens = activeDevices.map((d) => d.token);
      await this.sendMulticast(tokens, payload);
    } catch (err) {
      logger.error(err, `[PushNotification] Error sending push to user ${userId}`);
    }
  }

  public async sendToToken(token: string, payload: PushNotificationPayload): Promise<boolean> {
    if (!this.isInitialized || !this.messaging) {
      logger.debug('[PushNotification] Skipping send: Firebase not initialized.');
      return false;
    }

    try {
      const message: Message = {
        token: token.trim(),
        notification: {
          title: payload.title,
          body: payload.body,
        },
        data: payload.data || {},
        android: {
          priority: 'high',
          notification: {
            channelId: payload.channelId || 'scanmenu_alerts_channel',
            sound: payload.sound || 'default',
            tag: payload.tag,
            priority: 'max',
            visibility: 'public',
            defaultVibrateTimings: true,
            defaultSound: true,
          },
        },
        apns: {
          payload: {
            aps: {
              sound: payload.sound || 'default',
              badge: 1,
              contentAvailable: true,
            },
          },
        },
      };

      await this.messaging.send(message);
      return true;
    } catch (err: any) {
      logger.error(err, `[PushNotification] Failed to send single push to token ${token}`);
      if (
        err.code === 'messaging/invalid-registration-token' ||
        err.code === 'messaging/registration-token-not-registered'
      ) {
        await DeviceToken.updateOne({ token: token.trim() }, { isActive: false });
      }
      return false;
    }
  }

  private async sendMulticast(tokens: string[], payload: PushNotificationPayload): Promise<void> {
    if (!this.isInitialized || !this.messaging) {
      logger.debug(`[PushNotification] Fallback: Would send push to ${tokens.length} devices -> "${payload.title}: ${payload.body}"`);
      return;
    }

    if (tokens.length === 0) return;

    const batchSize = 500;
    for (let i = 0; i < tokens.length; i += batchSize) {
      const batchTokens = tokens.slice(i, i + batchSize);

      try {
        const multicastMsg: MulticastMessage = {
          tokens: batchTokens,
          notification: {
            title: payload.title,
            body: payload.body,
          },
          data: payload.data || {},
          android: {
            priority: 'high',
            notification: {
              channelId: payload.channelId || 'scanmenu_alerts_channel',
              sound: payload.sound || 'default',
              tag: payload.tag,
              priority: 'max',
              visibility: 'public',
              defaultVibrateTimings: true,
              defaultSound: true,
            },
          },
          apns: {
            payload: {
              aps: {
                sound: payload.sound || 'default',
                badge: 1,
                contentAvailable: true,
              },
            },
          },
        };

        const response = await this.messaging.sendEachForMulticast(multicastMsg);

        logger.info(`[PushNotification] Multicast sent. Success: ${response.successCount}, Failures: ${response.failureCount}`);

        if (response.failureCount > 0) {
          const tokensToDeactivate: string[] = [];
          response.responses.forEach((resp: any, idx: number) => {
            if (!resp.success) {
              const code = resp.error?.code;
              if (
                code === 'messaging/invalid-registration-token' ||
                code === 'messaging/registration-token-not-registered'
              ) {
                tokensToDeactivate.push(batchTokens[idx]);
              }
            }
          });

          if (tokensToDeactivate.length > 0) {
            await DeviceToken.updateMany(
              { token: { $in: tokensToDeactivate } },
              { isActive: false }
            );
            logger.info(`[PushNotification] Deactivated ${tokensToDeactivate.length} invalid device tokens.`);
          }
        }
      } catch (batchErr) {
        logger.error(batchErr, '[PushNotification] Error sending multicast batch');
      }
    }
  }
}

export const pushNotificationService = PushNotificationService.getInstance();
export default pushNotificationService;
