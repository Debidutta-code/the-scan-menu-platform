import mongoose from 'mongoose';
import config from '../config';
import { getTodayDateKey } from './orderCounter';

const orderSchema = new mongoose.Schema({
  restaurantId: mongoose.Schema.Types.ObjectId,
  orderDate: String,
  orderNumber: Number,
});
const orderCounterSchema = new mongoose.Schema({
  restaurantId: mongoose.Schema.Types.ObjectId,
  dateKey: String,
  seq: Number,
});

const Order = mongoose.model('Order', orderSchema, 'orders');
const OrderCounter = mongoose.model('OrderCounter', orderCounterSchema, 'order_counters');

async function syncCounters() {
  await mongoose.connect(config.db.mongoUri);
  console.log('Connected. Syncing order counters...');

  const dateKey = getTodayDateKey();
  const restaurants = await Order.distinct('restaurantId');
  for (const restId of restaurants) {
    const max = await Order.findOne({ restaurantId: restId, orderDate: dateKey }).sort({ orderNumber: -1 }).select('orderNumber').lean() as any;
    const maxNum: number = max?.orderNumber ?? 0;

    const result = await OrderCounter.findOneAndUpdate(
      { restaurantId: restId, dateKey },
      { $max: { seq: maxNum } },
      { upsert: true, new: true }
    );
    console.log(`  Restaurant ${restId} → counter synced to ${result!.seq} for date ${dateKey}`);
  }

  await mongoose.disconnect();
  console.log('Done.');
}

syncCounters().catch((e) => { console.error(e); process.exit(1); });
