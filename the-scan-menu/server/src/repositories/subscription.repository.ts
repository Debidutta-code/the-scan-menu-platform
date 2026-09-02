import { Types, ClientSession } from 'mongoose';
import { SubscriptionPlan, ISubscriptionPlan } from '../models/SubscriptionPlan';

export class SubscriptionRepository {
  async findAll(): Promise<ISubscriptionPlan[]> {
    return SubscriptionPlan.find().sort({ createdAt: 1 });
  }

  async findByKey(key: string): Promise<ISubscriptionPlan | null> {
    return SubscriptionPlan.findOne({ key });
  }

  async findById(id: string | Types.ObjectId): Promise<ISubscriptionPlan | null> {
    return SubscriptionPlan.findById(id);
  }

  async create(data: Partial<ISubscriptionPlan>, session?: ClientSession): Promise<ISubscriptionPlan> {
    const plan = new SubscriptionPlan(data);
    return plan.save({ session });
  }

  async updateById(id: string | Types.ObjectId, data: Partial<ISubscriptionPlan>, session?: ClientSession): Promise<ISubscriptionPlan | null> {
    return SubscriptionPlan.findByIdAndUpdate(id, data, { new: true, session });
  }
}

export const subscriptionRepository = new SubscriptionRepository();
