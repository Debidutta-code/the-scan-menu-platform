import { Types, ClientSession } from 'mongoose';
import { Restaurant, IRestaurant, RestaurantStatus } from '../models/Restaurant';

export class RestaurantRepository {
  async findById(id: string | Types.ObjectId): Promise<IRestaurant | null> {
    return Restaurant.findById(id);
  }

  async findBySlug(slug: string): Promise<IRestaurant | null> {
    return Restaurant.findOne({ slug: slug.toLowerCase().trim() });
  }

  async findByCode(code: string): Promise<IRestaurant | null> {
    return Restaurant.findOne({ code });
  }

  async findByCustomDomain(domain: string): Promise<IRestaurant | null> {
    return Restaurant.findOne({ customDomain: domain.toLowerCase() });
  }

  async findBySlugOrId(slugOrId: string): Promise<IRestaurant | null> {
    if (Types.ObjectId.isValid(slugOrId)) {
      return Restaurant.findById(slugOrId);
    }
    return Restaurant.findOne({ slug: slugOrId.toLowerCase() });
  }

  async findAll(filter: Record<string, any> = {}): Promise<IRestaurant[]> {
    return Restaurant.find(filter).sort({ createdAt: -1 });
  }

  async findAllExcludeArchived(): Promise<IRestaurant[]> {
    return Restaurant.find({ status: { $ne: 'ARCHIVED' } });
  }

  async countByStatus(status: RestaurantStatus): Promise<number> {
    return Restaurant.countDocuments({ status });
  }

  async countTotal(): Promise<number> {
    return Restaurant.countDocuments();
  }

  async create(data: Partial<IRestaurant>, session?: ClientSession): Promise<IRestaurant> {
    const restaurant = new Restaurant(data);
    return restaurant.save({ session });
  }

  async updateById(id: string | Types.ObjectId, data: Partial<IRestaurant>, session?: ClientSession): Promise<IRestaurant | null> {
    return Restaurant.findByIdAndUpdate(id, data, { new: true, session });
  }

  async updateBySlug(slug: string, data: Partial<IRestaurant>): Promise<IRestaurant | null> {
    return Restaurant.findOneAndUpdate({ slug }, data, { new: true });
  }

  async deleteById(id: string | Types.ObjectId, session?: ClientSession): Promise<void> {
    await Restaurant.findByIdAndDelete(id, { session });
  }

  async findOne(query: Record<string, any>): Promise<IRestaurant | null> {
    return Restaurant.findOne(query);
  }

  async aggregate(pipeline: any[]): Promise<any[]> {
    return Restaurant.aggregate(pipeline);
  }

  async find(
    query: Record<string, any> = {},
    sort: Record<string, any> = { createdAt: -1 },
    skip?: number,
    limit?: number
  ): Promise<IRestaurant[]> {
    let q = Restaurant.find(query).sort(sort);
    if (typeof skip === 'number') q = q.skip(skip);
    if (typeof limit === 'number') q = q.limit(limit);
    return q;
  }

  async count(query: Record<string, any> = {}): Promise<number> {
    return Restaurant.countDocuments(query);
  }

  async save(restaurant: IRestaurant, session?: ClientSession): Promise<IRestaurant> {
    return restaurant.save({ session });
  }

  async slugExists(slug: string): Promise<boolean> {
    const doc = await Restaurant.exists({ slug });
    return !!doc;
  }

  async codeExists(code: string): Promise<boolean> {
    const doc = await Restaurant.exists({ code });
    return !!doc;
  }
}

export const restaurantRepository = new RestaurantRepository();
