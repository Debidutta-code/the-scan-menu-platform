import { Types } from 'mongoose';
import { Order, OrderCounter } from '../models/Order';

export function getTodayDateKey(timezone = 'Asia/Kolkata', date = new Date()): string {
  try {
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    return formatter.format(date); // Format: "YYYY-MM-DD"
  } catch (err) {
    return date.toISOString().split('T')[0];
  }
}

export interface NextOrderNumberResult {
  orderNumber: number;
  orderDate: string;
}

/**
 * Atomically gets the next sequential order number for a restaurant for today.
 * Resets to #1 at midnight (new dateKey).
 *
 * @param restaurantId - ObjectId of the restaurant
 * @param timezone - Optional timezone string (defaults to 'Asia/Kolkata')
 * @returns object containing orderNumber (1-based, daily sequential) and orderDate ("YYYY-MM-DD")
 */
export async function getNextOrderNumberDetails(
  restaurantId: string | Types.ObjectId,
  timezone = 'Asia/Kolkata'
): Promise<NextOrderNumberResult> {
  const restId = typeof restaurantId === 'string'
    ? new Types.ObjectId(restaurantId)
    : restaurantId;

  const dateKey = getTodayDateKey(timezone);

  // Atomically increment the counter for today's dateKey
  const counter = await OrderCounter.findOneAndUpdate(
    { restaurantId: restId, dateKey },
    { $inc: { seq: 1 } },
    { upsert: true, new: true }
  );

  let seq = counter.seq;

  // Self-healing check: if counter seq already exists for today's dateKey,
  // fast-forward counter past current max for today.
  const existing = await Order.findOne({ restaurantId: restId, orderDate: dateKey, orderNumber: seq });
  if (existing) {
    const maxDoc = await Order.findOne({ restaurantId: restId, orderDate: dateKey })
      .sort({ orderNumber: -1 })
      .select('orderNumber')
      .lean();

    const maxOrderNumber = (maxDoc as any)?.orderNumber ?? seq;

    const healed = await OrderCounter.findOneAndUpdate(
      { restaurantId: restId, dateKey },
      { $max: { seq: maxOrderNumber + 1 } },
      { new: true }
    );

    seq = healed!.seq;
  }

  return { orderNumber: seq, orderDate: dateKey };
}

export async function getNextOrderNumber(
  restaurantId: string | Types.ObjectId,
  timezone = 'Asia/Kolkata'
): Promise<number> {
  const result = await getNextOrderNumberDetails(restaurantId, timezone);
  return result.orderNumber;
}
