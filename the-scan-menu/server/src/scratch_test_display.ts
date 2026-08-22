import mongoose from 'mongoose';
import config from './config';
import { Restaurant } from './models/Restaurant';
import { FeatureFlag } from './models/FeatureFlag';
import { Order } from './models/Order';

async function testLiveDisplay() {
  await mongoose.connect(config.db.mongoUri);
  console.log('Connected to MongoDB');

  const demoRest = await Restaurant.findOne({ slug: 'demo-cafe' });
  if (!demoRest) {
    console.error('Demo Cafe not found');
    process.exit(1);
  }
  console.log(`Found Restaurant: ${demoRest.name} (${demoRest._id})`);

  // Ensure customer_display flag is enabled
  await FeatureFlag.findOneAndUpdate(
    { restaurantId: demoRest._id, key: 'customer_display' },
    { $set: { enabled: true } },
    { upsert: true }
  );

  // Check feature flag
  const flag = await FeatureFlag.findOne({ restaurantId: demoRest._id, key: 'customer_display' });
  console.log(`customer_display feature flag status: ${flag?.enabled ? 'ENABLED' : 'DISABLED'}`);

  // Create or verify preparing/ready orders
  const preparingCount = await Order.countDocuments({ restaurantId: demoRest._id, status: 'PREPARING' });
  const readyCount = await Order.countDocuments({ restaurantId: demoRest._id, status: 'READY' });
  console.log(`Active Orders: ${preparingCount} Preparing, ${readyCount} Ready`);

  // If no preparing orders, create a sample order for display verification
  if (preparingCount === 0) {
    const sampleOrder = await Order.create({
      restaurantId: demoRest._id,
      orderNumber: 104,
      orderType: 'DINE_IN',
      status: 'PREPARING',
      paymentStatus: 'PAID',
      items: [
        {
          name: 'Paneer Butter Masala',
          price: 25000,
          quantity: 2,
          status: 'PREPARING',
        },
      ],
      totalAmount: 50000,
    });
    console.log(`Created sample PREPARING order #${sampleOrder.orderNumber} (${sampleOrder._id})`);
  }

  if (readyCount === 0) {
    const sampleReady = await Order.create({
      restaurantId: demoRest._id,
      orderNumber: 102,
      orderType: 'TAKEAWAY',
      status: 'READY',
      paymentStatus: 'PAID',
      items: [
        {
          name: 'Cold Coffee Frappe',
          price: 18000,
          quantity: 1,
          status: 'READY',
        },
      ],
      totalAmount: 18000,
    });
    console.log(`Created sample READY order #${sampleReady.orderNumber} (${sampleReady._id})`);
  }

  console.log('✅ Live display database check complete!');
  process.exit(0);
}

testLiveDisplay().catch((e) => {
  console.error('Test error:', e);
  process.exit(1);
});
