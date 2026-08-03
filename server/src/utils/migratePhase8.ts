import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { Order } from '../models/Order';

dotenv.config();

const MONGO_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/pixora-qr-menu';

export async function migratePhase8(): Promise<number> {
  console.log('Starting Phase 8 OrderMode Migration...');
  let updatedCount = 0;
  try {
    if (mongoose.connection.readyState !== 1) {
      await mongoose.connect(MONGO_URI);
      console.log('Connected to MongoDB.');
    }

    // Find orders that lack an orderMode field or have null/undefined orderMode
    const result = await Order.updateMany(
      {
        $or: [
          { orderMode: { $exists: false } },
          { orderMode: null },
        ],
      },
      {
        $set: { orderMode: 'DINE_IN' },
      }
    );

    updatedCount = result.modifiedCount || 0;
    console.log(`Migration completed successfully. Backfilled orderMode: 'DINE_IN' for ${updatedCount} orders.`);
  } catch (error) {
    console.error('Phase 8 Migration failed:', error);
    throw error;
  }
  return updatedCount;
}

// Execute directly if invoked via CLI
if (require.main === module) {
  migratePhase8().then(() => {
    mongoose.disconnect();
    console.log('Disconnected from MongoDB.');
  }).catch(() => {
    mongoose.disconnect();
    process.exit(1);
  });
}
