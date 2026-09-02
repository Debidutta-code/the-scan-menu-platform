import { Types, ClientSession } from 'mongoose';
import { WebhookSubscription, IWebhookSubscription, WebhookEventType } from '../models/WebhookSubscription';

export class WebhookSubscriptionRepository {
  async findByRestaurantId(restaurantId: string | Types.ObjectId): Promise<IWebhookSubscription[]> {
    return WebhookSubscription.find({ restaurantId: new Types.ObjectId(restaurantId.toString()) }).sort({ createdAt: -1 });
  }

  async findActiveByEvent(event: WebhookEventType): Promise<IWebhookSubscription[]> {
    return WebhookSubscription.find({
      events: { $in: [event] },
      isActive: true,
    });
  }

  async findById(id: string | Types.ObjectId): Promise<IWebhookSubscription | null> {
    return WebhookSubscription.findById(id);
  }

  async findByIdAndRestaurant(
    id: string | Types.ObjectId,
    restaurantId: string | Types.ObjectId
  ): Promise<IWebhookSubscription | null> {
    return WebhookSubscription.findOne({
      _id: new Types.ObjectId(id.toString()),
      restaurantId: new Types.ObjectId(restaurantId.toString()),
    });
  }

  async create(data: Partial<IWebhookSubscription>, session?: ClientSession): Promise<IWebhookSubscription> {
    return WebhookSubscription.create([data], { session }).then((docs: any[]) => docs[0]);
  }

  async updateById(
    id: string | Types.ObjectId,
    data: Record<string, any>,
    session?: ClientSession
  ): Promise<IWebhookSubscription | null> {
    return WebhookSubscription.findOneAndUpdate(
      { _id: new Types.ObjectId(id.toString()) },
      data,
      { new: true, session }
    );
  }

  async deleteByIdAndRestaurant(
    id: string | Types.ObjectId,
    restaurantId: string | Types.ObjectId,
    session?: ClientSession
  ): Promise<boolean> {
    const res = await WebhookSubscription.deleteOne({
      _id: new Types.ObjectId(id.toString()),
      restaurantId: new Types.ObjectId(restaurantId.toString()),
    }, { session });
    return res.deletedCount > 0;
  }

  async deleteByRestaurantId(restaurantId: string | Types.ObjectId, session?: ClientSession): Promise<void> {
    await WebhookSubscription.deleteMany({ restaurantId: new Types.ObjectId(restaurantId.toString()) }, { session });
  }
}

export const webhookSubscriptionRepository = new WebhookSubscriptionRepository();
