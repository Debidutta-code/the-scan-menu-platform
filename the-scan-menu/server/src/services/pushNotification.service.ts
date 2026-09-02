import fs from 'fs';
import path from 'path';
import { initializeApp, getApps, cert, applicationDefault, App } from 'firebase-admin/app';
import { getMessaging, Messaging, Message, MulticastMessage } from 'firebase-admin/messaging';
import config from '../config';
import { IDeviceToken } from '../models/DeviceToken';
import { deviceTokenRepository } from '../repositories/deviceToken.repository';
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

  public isServiceInitialized(): boolean {
    return this.isInitialized && this.messaging !== null;
  }

  private initFirebase(): void {
    const existingApps = getApps();
    if (existingApps.length > 0) {
      this.app = existingApps[0];
      this.messaging = getMessaging(this.app);
      this.isInitialized = true;
      logger.info(`[PushNotification] Reusing existing Firebase Admin app (${this.app.name}). Messaging ready.`);
      return;
    }

    try {
      const rawKey = config.firebase.serviceAccountKey;

      if (rawKey && rawKey.trim().length > 0) {
        let credentialObj: any;
        const trimmed = rawKey.trim();

        // 1. Check if rawKey is direct JSON string
        if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
          try {
            credentialObj = JSON.parse(trimmed);
          } catch (jsonErr) {
            logger.error(jsonErr, '[PushNotification] Failed to parse FIREBASE_SERVICE_ACCOUNT_KEY JSON string');
          }
        }
        // 2. Check if rawKey is base64-encoded JSON string
        else if (!trimmed.includes('\n') && !fs.existsSync(path.resolve(process.cwd(), trimmed))) {
          try {
            const decoded = Buffer.from(trimmed, 'base64').toString('utf-8');
            if (decoded.startsWith('{') && decoded.endsWith('}')) {
              credentialObj = JSON.parse(decoded);
            }
          } catch (_) {
            // Not a base64 string, proceed to file path check
          }
        }

        // 3. Check if rawKey is a file path
        if (!credentialObj) {
          const resolvedPath = path.resolve(process.cwd(), trimmed);
          if (fs.existsSync(resolvedPath)) {
            try {
              const fileData = fs.readFileSync(resolvedPath, 'utf-8');
              credentialObj = JSON.parse(fileData);
            } catch (fileErr) {
              logger.error(fileErr, `[PushNotification] Failed to read/parse Firebase credentials file at: ${resolvedPath}`);
            }
          }
        }

        if (credentialObj) {
          // Normalize private key escaped newlines often introduced in cloud environment variables (e.g. Render)
          if (typeof credentialObj.private_key === 'string') {
            credentialObj.private_key = credentialObj.private_key.replace(/\\n/g, '\n');
          }

          const targetProjectId = config.firebase.projectId || credentialObj.project_id;

          this.app = initializeApp({
            credential: cert(credentialObj),
            projectId: targetProjectId,
          });
          this.messaging = getMessaging(this.app);
          this.isInitialized = true;
          logger.info(`[PushNotification] Firebase Admin initialized successfully -> Project: "${targetProjectId || 'default'}", Service Account: "${credentialObj.client_email || 'unknown'}"`);
          return;
        }
      }

      // Check default application credentials (GOOGLE_APPLICATION_CREDENTIALS)
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

      logger.warn('[PushNotification] Firebase service account credentials not configured. Push notifications will operate in fallback mode (in-app Socket.IO alerts remain active). Set FIREBASE_SERVICE_ACCOUNT_KEY in production to enable FCM.');
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
    const existing = await deviceTokenRepository.upsertByUserAndToken(userId, restaurantId, cleanToken, {
      platform,
      deviceModel,
      appVersion,
    });
    logger.info(`[PushNotification] Registered device token: User=${userId}, Restaurant=${restaurantId}, Platform=${platform}, Token=${cleanToken.substring(0, 15)}...`);
    return existing;
  }

  public async unregisterDevice(token: string): Promise<void> {
    if (!token) return;
    const cleanToken = token.trim();
    const record = await deviceTokenRepository.findByToken(cleanToken);
    if (record) {
      record.isActive = false;
      await deviceTokenRepository.save(record);
    }
    logger.info(`[PushNotification] Unregistered device token: ${cleanToken.substring(0, 15)}...`);
  }

  public async sendToRestaurant(restaurantId: string, payload: PushNotificationPayload): Promise<void> {
    try {
      const activeDevices = await deviceTokenRepository.findByRestaurantId(restaurantId, true);
      if (activeDevices.length === 0) {
        logger.debug(`[PushNotification] No active devices found for restaurant ${restaurantId}. Title="${payload.title}"`);
        return;
      }

      const tokens = activeDevices.map((d) => d.token);
      logger.info(`[PushNotification] Sending push to restaurant ${restaurantId} (${tokens.length} active device(s)): "${payload.title}"`);
      await this.sendMulticast(tokens, payload);
    } catch (err) {
      logger.error(err, `[PushNotification] Error sending push to restaurant ${restaurantId}`);
    }
  }

  public async sendToUser(userId: string, payload: PushNotificationPayload): Promise<void> {
    try {
      const activeDevices = await deviceTokenRepository.findByUserId(userId, true);
      if (activeDevices.length === 0) {
        logger.debug(`[PushNotification] No active devices found for user ${userId}`);
        return;
      }

      const tokens = activeDevices.map((d) => d.token);
      logger.info(`[PushNotification] Sending push to user ${userId} (${tokens.length} active device(s)): "${payload.title}"`);
      await this.sendMulticast(tokens, payload);
    } catch (err) {
      logger.error(err, `[PushNotification] Error sending push to user ${userId}`);
    }
  }

  public async sendToToken(token: string, payload: PushNotificationPayload): Promise<boolean> {
    if (!this.isInitialized || !this.messaging) {
      logger.warn('[PushNotification] Skipping send: Firebase Admin Messaging not initialized.');
      return false;
    }

    try {
      const cleanToken = token.trim();
      const channelId = payload.channelId || 'scanmenu_alerts_channel';
      const soundName = payload.sound || 'call_bell';

      const message: Message = {
        token: cleanToken,
        notification: {
          title: payload.title,
          body: payload.body,
        },
        data: payload.data || {},
        android: {
          priority: 'high',
          notification: {
            channelId,
            sound: soundName,
            tag: payload.tag,
            priority: 'max',
            visibility: 'public',
            defaultVibrateTimings: true,
            defaultSound: false,
          },
        },
        apns: {
          payload: {
            aps: {
              sound: soundName,
              badge: 1,
              contentAvailable: true,
            },
          },
        },
      };

      const messageId = await this.messaging.send(message);
      logger.info(`[PushNotification] Single push delivered to token ${cleanToken.substring(0, 15)}... | MessageId: ${messageId}`);
      return true;
    } catch (err: any) {
      logger.error(err, `[PushNotification] Failed to send single push to token ${token.substring(0, 15)}... Code: ${err.code}`);
      if (
        err.code === 'messaging/invalid-registration-token' ||
        err.code === 'messaging/registration-token-not-registered'
      ) {
        await deviceTokenRepository.deactivateByToken(token);
        logger.info(`[PushNotification] Deactivated stale device token: ${token.substring(0, 15)}...`);
      }
      return false;
    }
  }

  private async sendMulticast(tokens: string[], payload: PushNotificationPayload): Promise<void> {
    if (!this.isInitialized || !this.messaging) {
      logger.info(`[PushNotification Fallback] Socket.IO active. Would send FCM to ${tokens.length} devices -> "${payload.title}: ${payload.body}"`);
      return;
    }

    if (tokens.length === 0) return;

    const channelId = payload.channelId || 'scanmenu_alerts_channel';
    const soundName = payload.sound || 'call_bell';

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
              channelId,
              sound: soundName,
              tag: payload.tag,
              priority: 'max',
              visibility: 'public',
              defaultVibrateTimings: true,
              defaultSound: false,
            },
          },
          apns: {
            payload: {
              aps: {
                sound: soundName,
                badge: 1,
                contentAvailable: true,
              },
            },
          },
        };

        const response = await this.messaging.sendEachForMulticast(multicastMsg);

        logger.info(
          `[PushNotification] Multicast batch (${batchTokens.length} devices) sent -> Success: ${response.successCount}, Failures: ${response.failureCount}`
        );

        if (response.failureCount > 0) {
          const tokensToDeactivate: string[] = [];
          response.responses.forEach((resp: any, idx: number) => {
            if (!resp.success) {
              const code = resp.error?.code;
              logger.warn(
                `[PushNotification] FCM send failure for token ${batchTokens[idx].substring(0, 15)}... -> Code: ${code}, Message: ${resp.error?.message}`
              );
              if (
                code === 'messaging/invalid-registration-token' ||
                code === 'messaging/registration-token-not-registered'
              ) {
                tokensToDeactivate.push(batchTokens[idx]);
              }
            }
          });

          if (tokensToDeactivate.length > 0) {
            await deviceTokenRepository.deactivateByTokens(tokensToDeactivate);
            logger.info(`[PushNotification] Deactivated ${tokensToDeactivate.length} invalid/unregistered device tokens.`);
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

