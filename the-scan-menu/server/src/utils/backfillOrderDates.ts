import mongoose from 'mongoose';
import config from '../config';
import { Order } from '../models/Order';

async function backfillOrderDates() {
  await mongoose.connect(config.db.mongoUri);
  console.log('Connected to MongoDB. Backfilling orderDate on orders...');

  const ordersWithoutDate = await Order.find({ orderDate: { $exists: false } }).select('_id createdAt').lean();
  console.log(`Found ${ordersWithoutDate.length} orders missing orderDate.`);

  let updated = 0;
  for (const doc of ordersWithoutDate) {
    const createdAt = (doc as any).createdAt || new Date();
    let dateStr: string;
    try {
      const formatter = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Asia/Kolkata',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      });
      dateStr = formatter.format(createdAt);
    } catch {
      dateStr = new Date(createdAt).toISOString().split('T')[0];
    }

    await Order.updateOne({ _id: doc._id }, { $set: { orderDate: dateStr } });
    updated++;
  }

  console.log(`Successfully backfilled ${updated} orders with orderDate.`);

  // Drop old index if exists and sync new indexes
  try {
    await Order.collection.dropIndex('restaurantId_1_orderNumber_1');
    console.log('Dropped old index: restaurantId_1_orderNumber_1');
  } catch (err: any) {
    console.log('Old index drop note:', err.message);
  }

  await Order.syncIndexes();
  console.log('Synced Order collection indexes.');

  await mongoose.disconnect();
  console.log('Done.');
}

backfillOrderDates().catch((err) => {
  console.error('Error backfilling orderDate:', err);
  process.exit(1);
});
