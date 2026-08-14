/**
 * global.setup.ts
 * Runs once before the entire Playwright suite.
 * Seeds a test Manager, Restaurant, RestaurantStaff, FeatureFlags,
 * Categories, MenuItems, and a Table into the live MongoDB database,
 * then writes the seeded IDs to e2e/seed-state.json.
 */

import mongoose from 'mongoose';
import bcrypt from 'bcrypt';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config({ path: path.resolve(__dirname, '../server/.env') });

// ── Inline minimal schemas (avoids importing compiled server code) ──────────
const userSchema = new mongoose.Schema({
  email: String, passwordHash: String, role: String,
  name: String, isActive: { type: Boolean, default: true },
}, { timestamps: true });

const restaurantSchema = new mongoose.Schema({
  code: { type: String, unique: true },
  name: String,
  slug: { type: String, unique: true },
  status: { type: String, default: 'ACTIVE' },
  logoUrl: String,
  subscription: {
    status: { type: String, default: 'ACTIVE' },
    planKey: { type: String, default: 'ENTERPRISE' },
    expiresAt: { type: Date, default: () => new Date(Date.now() + 365 * 24 * 60 * 60 * 1000) },
  },
}, { timestamps: true });

const restaurantStaffSchema = new mongoose.Schema({
  userId: mongoose.Schema.Types.ObjectId,
  restaurantId: mongoose.Schema.Types.ObjectId,
  role: String,
  isActive: { type: Boolean, default: true },
}, { timestamps: true, collection: 'restaurant_staff' });

const featureFlagSchema = new mongoose.Schema({
  restaurantId: mongoose.Schema.Types.ObjectId,
  key: String,
  enabled: { type: Boolean, default: true },
  description: String,
}, { timestamps: true });

const categorySchema = new mongoose.Schema({
  restaurantId: mongoose.Schema.Types.ObjectId,
  name: String, sortOrder: Number, isActive: { type: Boolean, default: true },
}, { timestamps: true });

const menuItemSchema = new mongoose.Schema({
  restaurantId: mongoose.Schema.Types.ObjectId,
  categoryId: mongoose.Schema.Types.ObjectId,
  name: String, price: Number, sortOrder: Number,
  isAvailable: { type: Boolean, default: true },
  trackStock: { type: Boolean, default: false },
  stockQuantity: { type: Number, default: 0 },
  isVegetarian: { type: Boolean, default: false },
}, { timestamps: true });

const tableSchema = new mongoose.Schema({
  restaurantId: mongoose.Schema.Types.ObjectId,
  tableNumber: String,
  token: String,
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

async function globalSetup() {
  const uri = process.env.MONGODB_URI!;
  await mongoose.connect(uri);

  const User = mongoose.models.User || mongoose.model('User', userSchema);
  const Restaurant = mongoose.models.Restaurant || mongoose.model('Restaurant', restaurantSchema);
  const RestaurantStaff = mongoose.models.RestaurantStaff || mongoose.model('RestaurantStaff', restaurantStaffSchema);
  const FeatureFlag = mongoose.models.FeatureFlag || mongoose.model('FeatureFlag', featureFlagSchema);
  const Category = mongoose.models.Category || mongoose.model('Category', categorySchema);
  const MenuItem = mongoose.models.MenuItem || mongoose.model('MenuItem', menuItemSchema);
  const Table = mongoose.models.Table || mongoose.model('Table', tableSchema);

  // Clean any leftover seed data from a previous failed run
  const existingUser = await User.findOne({ email: 'e2e-manager@scanmenu.test' });
  if (existingUser) {
    const existingStaff = await RestaurantStaff.findOne({ userId: existingUser._id });
    if (existingStaff) {
      const restaurantId = existingStaff.restaurantId;
      await MenuItem.deleteMany({ restaurantId });
      await Category.deleteMany({ restaurantId });
      await Table.deleteMany({ restaurantId });
      await FeatureFlag.deleteMany({ restaurantId });
      await RestaurantStaff.deleteMany({ userId: existingUser._id });
      await Restaurant.deleteOne({ _id: restaurantId });
    }
    await User.deleteOne({ _id: existingUser._id });
  }
  // Also clean by slug in case of partial cleanup
  const existingRestaurant = await Restaurant.findOne({ slug: 'e2e-test-restaurant' });
  if (existingRestaurant) {
    await MenuItem.deleteMany({ restaurantId: existingRestaurant._id });
    await Category.deleteMany({ restaurantId: existingRestaurant._id });
    await Table.deleteMany({ restaurantId: existingRestaurant._id });
    await FeatureFlag.deleteMany({ restaurantId: existingRestaurant._id });
    await RestaurantStaff.deleteMany({ restaurantId: existingRestaurant._id });
    await Restaurant.deleteOne({ _id: existingRestaurant._id });
  }

  // 1. Seed Manager user
  const passwordHash = await bcrypt.hash('E2eTest@1234', 10);
  const user = await User.create({
    email: 'e2e-manager@scanmenu.test',
    passwordHash,
    role: 'MANAGER',
    name: 'E2E Test Manager',
    isActive: true,
  });

  // 2. Seed Restaurant (code is required and unique)
  const restaurant = await Restaurant.create({
    code: `E2E-${Date.now()}`,
    name: 'E2E Test Restaurant',
    slug: 'e2e-test-restaurant',
    status: 'ACTIVE',
    subscription: {
      status: 'ACTIVE',
      planKey: 'ENTERPRISE',
      expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
    },
  });

  // 3. Seed RestaurantStaff link — THIS is what auth.controller uses to build assignedRestaurants
  await RestaurantStaff.create({
    userId: user._id,
    restaurantId: restaurant._id,
    role: 'MANAGER',
    isActive: true,
  });

  // 4. Seed FeatureFlags (all features enabled for E2E)
  const features = ['qr_menu', 'menu', 'ordering', 'kds', 'analytics', 'payments', 'inventory', 'white_label', 'api_webhooks', 'waiter_call', 'delivery', 'takeaway', 'pos'];
  await FeatureFlag.insertMany(
    features.map((key) => ({
      restaurantId: restaurant._id,
      key,
      enabled: true,
      description: `E2E test flag: ${key}`,
    }))
  );

  // 5. Seed Categories
  const cat1 = await Category.create({
    restaurantId: restaurant._id, name: 'Starters', sortOrder: 0,
  });
  const cat2 = await Category.create({
    restaurantId: restaurant._id, name: 'Main Course', sortOrder: 1,
  });

  // 6. Seed Menu Items
  const item1 = await MenuItem.create({
    restaurantId: restaurant._id, categoryId: cat1._id,
    name: 'Spring Rolls', price: 15000, sortOrder: 0,
    isAvailable: true, isVegetarian: true,
  });
  const item2 = await MenuItem.create({
    restaurantId: restaurant._id, categoryId: cat1._id,
    name: 'Chicken Wings', price: 28000, sortOrder: 1,
    isAvailable: true,
  });
  const item3 = await MenuItem.create({
    restaurantId: restaurant._id, categoryId: cat2._id,
    name: 'Grilled Salmon', price: 55000, sortOrder: 0,
    isAvailable: true,
  });

  // 7. Seed Table
  const table = await Table.create({
    restaurantId: restaurant._id,
    tableNumber: 'T-E2E-1',
    token: 'e2e-test-table-token-abc123',
    isActive: true,
  });

  // Write seed state for tests & teardown
  const seedState = {
    userId: user._id.toString(),
    restaurantId: restaurant._id.toString(),
    restaurantSlug: 'e2e-test-restaurant',
    categoryIds: [cat1._id.toString(), cat2._id.toString()],
    menuItemIds: [item1._id.toString(), item2._id.toString(), item3._id.toString()],
    tableId: table._id.toString(),
    tableToken: 'e2e-test-table-token-abc123',
    managerEmail: 'e2e-manager@scanmenu.test',
    managerPassword: 'E2eTest@1234',
  };

  const stateDir = path.resolve(__dirname, '.auth');
  if (!fs.existsSync(stateDir)) fs.mkdirSync(stateDir, { recursive: true });

  fs.writeFileSync(
    path.resolve(__dirname, 'seed-state.json'),
    JSON.stringify(seedState, null, 2)
  );

  console.log('[E2E Setup] Seeded test data successfully.');
  console.log(`  → Restaurant: ${restaurant._id} (slug: e2e-test-restaurant)`);
  console.log(`  → Manager: ${user._id} → RestaurantStaff linked`);
  console.log(`  → FeatureFlags: ${features.join(', ')}`);
  console.log(`  → Table token: e2e-test-table-token-abc123`);

  await mongoose.disconnect();
}

export default globalSetup;
