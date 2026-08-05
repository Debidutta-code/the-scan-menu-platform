import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

const orderSchema = new mongoose.Schema({
  restaurantId: mongoose.Schema.Types.ObjectId,
  orderNumber: Number,
});
const orderCounterSchema = new mongoose.Schema({
  restaurantId: { type: mongoose.Schema.Types.ObjectId, unique: true },
  seq: Number,
});

const Order = mongoose.model('Order', orderSchema, 'orders');
const OrderCounter = mongoose.model('OrderCounter', orderCounterSchema, 'order_counters');

async function syncCounters() {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/pixora-qr');
  console.log('Connected. Syncing order counters...');

  const restaurants = await Order.distinct('restaurantId');
  for (const restId of restaurants) {
    const max = await Order.findOne({ restaurantId: restId }).sort({ orderNumber: -1 }).select('orderNumber').lean() as any;
    const maxNum: number = max?.orderNumber ?? 0;

    const result = await OrderCounter.findOneAndUpdate(
      { restaurantId: restId },
      { $max: { seq: maxNum } },
      { upsert: true, new: true }
    );
    console.log(`  Restaurant ${restId} → counter synced to ${result!.seq} (max orderNumber was ${maxNum})`);
  }

  await mongoose.disconnect();
  console.log('Done.');
}

syncCounters().catch((e) => { console.error(e); process.exit(1); });
