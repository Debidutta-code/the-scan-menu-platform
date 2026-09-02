import crypto from 'crypto';
import axios from 'axios';
import { IWebhookSubscription, WebhookEventType } from '../models/WebhookSubscription';
import { webhookSubscriptionRepository } from '../repositories/webhookSubscription.repository';
import { CreateWebhookSubscriptionInput } from '../validators/webhook.validator';
import { Types } from 'mongoose';

export class WebhookDispatcherService {
  /**
   * Create a new Webhook Subscription for a restaurant.
   */
  async createSubscription(
    restaurantId: string,
    input: CreateWebhookSubscriptionInput
  ): Promise<IWebhookSubscription> {
    const secret = `whsec_${crypto.randomBytes(24).toString('hex')}`;
    return webhookSubscriptionRepository.create({
      restaurantId: new Types.ObjectId(restaurantId),
      targetUrl: input.targetUrl,
      events: input.events as WebhookEventType[],
      secret,
      isActive: true,
      failureCount: 0,
      deliveryLogs: [],
    });
  }

  /**
   * List all Webhook Subscriptions for a restaurant.
   */
  async listSubscriptions(restaurantId: string): Promise<IWebhookSubscription[]> {
    return webhookSubscriptionRepository.findByRestaurantId(restaurantId);
  }

  /**
   * Delete a Webhook Subscription.
   */
  async deleteSubscription(restaurantId: string, subscriptionId: string): Promise<boolean> {
    return webhookSubscriptionRepository.deleteByIdAndRestaurant(subscriptionId, restaurantId);
  }

  /**
   * Compute HMAC-SHA256 signature for outgoing webhook payload.
   */
  computeSignature(payloadStr: string, timestamp: number, secret: string): string {
    const signaturePayload = `${timestamp}.${payloadStr}`;
    return crypto.createHmac('sha256', secret).update(signaturePayload).digest('hex');
  }

  /**
   * Non-blocking dispatch of a webhook event payload to all subscribed endpoints.
   */
  async dispatchEvent(restaurantId: string | Types.ObjectId, event: WebhookEventType, payload: any): Promise<void> {
    try {
      const subscriptions = await webhookSubscriptionRepository.findActiveByEvent(event);
      const filtered = subscriptions.filter(
        s => s.restaurantId.toString() === restaurantId.toString()
      );

      if (!filtered || filtered.length === 0) {
        return;
      }

      const timestamp = Math.floor(Date.now() / 1000);
      const payloadStr = JSON.stringify(payload);

      for (const sub of filtered) {
        this.deliverToSubscription(sub, event, payload, payloadStr, timestamp);
      }
    } catch (err: any) {
      console.error(`Error in WebhookDispatcher.dispatchEvent [${event}]:`, err.message);
    }
  }

  /**
   * Deliver payload to a single subscription endpoint.
   */
  private async deliverToSubscription(
    sub: IWebhookSubscription,
    event: WebhookEventType,
    payload: any,
    payloadStr: string,
    timestamp: number
  ): Promise<void> {
    const signatureHex = this.computeSignature(payloadStr, timestamp, sub.secret);
    const signatureHeader = `t=${timestamp},v1=${signatureHex}`;

    let status = 0;
    let responseText = '';
    let errorMessage = '';

    try {
      const response = await axios.post(sub.targetUrl, payload, {
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'TheScanMenu-Webhook/1.0',
          'X-TSM-Signature': signatureHeader,
          'X-TSM-Event': event,
        },
        timeout: 5000,
      });

      status = response.status;
      responseText = typeof response.data === 'string' ? response.data : JSON.stringify(response.data);

      // Reset failure count on success
      await webhookSubscriptionRepository.updateById(sub._id as any, {
        failureCount: 0,
        $push: {
          deliveryLogs: {
            $each: [
              {
                event,
                payload,
                responseStatus: status,
                responseBody: responseText.substring(0, 1000),
                attempts: 1,
                deliveredAt: new Date(),
              },
            ],
            $slice: -50,
          },
        },
      } as any);
    } catch (err: any) {
      status = err.response?.status || 0;
      responseText = err.response?.data ? (typeof err.response.data === 'string' ? err.response.data : JSON.stringify(err.response.data)) : '';
      errorMessage = err.message || 'Webhook delivery failed';

      const newFailureCount = sub.failureCount + 1;
      const shouldDeactivate = newFailureCount >= 10;

      await webhookSubscriptionRepository.updateById(sub._id as any, {
        failureCount: newFailureCount,
        isActive: shouldDeactivate ? false : sub.isActive,
        $push: {
          deliveryLogs: {
            $each: [
              {
                event,
                payload,
                responseStatus: status,
                responseBody: responseText.substring(0, 1000),
                errorMessage,
                attempts: 1,
                deliveredAt: new Date(),
              },
            ],
            $slice: -50,
          },
        },
      } as any);
    }
  }
}

export const webhookDispatcherService = new WebhookDispatcherService();
export default webhookDispatcherService;
