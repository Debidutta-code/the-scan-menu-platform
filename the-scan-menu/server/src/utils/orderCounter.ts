import { Types } from 'mongoose';
import { Order, OrderCounter } from '../models/Order';

/**
 * Atomically gets the next sequential order number for a restaurant.
 *
 * Self-healing: if the OrderCounter is behind the actual max orderNumber in the
 * Orders collection (e.g. from direct DB inserts during testing or migrations),
 * the counter is advanced past the real maximum before incrementing. This prevents
 * E11000 duplicate key errors on the (restaurantId, orderNumber) unique index.
 *
 * @param restaurantId - ObjectId of the restaurant
 * @returns next safe, unique orderNumber (1-based, sequential per restaurant)
 */
export async function getNextOrderNumber(restaurantId: string | Types.ObjectId): Promise<number> {
  const restId = typeof restaurantId === 'string'
    ? new Types.ObjectId(restaurantId)
    : restaurantId;

  // Atomically increment the counter
  const counter = await OrderCounter.findOneAndUpdate(
    { restaurantId: restId },
    { $inc: { seq: 1 } },
    { upsert: true, new: true }
  );

  let seq = counter.seq;

  // Self-healing check: if the counter seq already exists as an orderNumber,
  // fast-forward the counter past the current max in the collection.
  const existing = await Order.findOne({ restaurantId: restId, orderNumber: seq });
  if (existing) {
    const maxDoc = await Order.findOne({ restaurantId: restId })
      .sort({ orderNumber: -1 })
      .select('orderNumber')
      .lean();

    const maxOrderNumber = (maxDoc as any)?.orderNumber ?? seq;

    // Advance the counter to max + 1 using $max to avoid a race
    const healed = await OrderCounter.findOneAndUpdate(
      { restaurantId: restId },
      { $max: { seq: maxOrderNumber + 1 } },
      { new: true }
    );

    seq = healed!.seq;
  }

  return seq;
}
