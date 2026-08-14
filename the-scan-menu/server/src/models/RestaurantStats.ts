import { Schema, model, Document, Types } from 'mongoose';

export interface IRestaurantStats extends Document {
  restaurantId: Types.ObjectId;
  menuItemsCount: number;
  tablesCount: number;
  staffCount: number;
  ordersCount: number;
  activeOrders: number;
  completedOrders: number;
  cancelledOrders: number;
  revenue: number;
  todayRevenue: number;
  todayOrders: number;
  createdAt: Date;
  updatedAt: Date;
}

const restaurantStatsSchema = new Schema<IRestaurantStats>(
  {
    restaurantId: { type: Schema.Types.ObjectId, ref: 'Restaurant', required: true, unique: true },
    menuItemsCount: { type: Number, required: true, default: 0 },
    tablesCount: { type: Number, required: true, default: 0 },
    staffCount: { type: Number, required: true, default: 0 },
    ordersCount: { type: Number, required: true, default: 0 },
    activeOrders: { type: Number, required: true, default: 0 },
    completedOrders: { type: Number, required: true, default: 0 },
    cancelledOrders: { type: Number, required: true, default: 0 },
    revenue: { type: Number, required: true, default: 0 },
    todayRevenue: { type: Number, required: true, default: 0 },
    todayOrders: { type: Number, required: true, default: 0 },
  },
  {
    timestamps: true,
    collection: 'restaurant_stats',
  }
);

export const RestaurantStats = model<IRestaurantStats>('RestaurantStats', restaurantStatsSchema);
export default RestaurantStats;
