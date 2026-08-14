/**
 * global.teardown.ts
 * Removes every document inserted during globalSetup using stored IDs.
 */

import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config({ path: path.resolve(__dirname, '../server/.env') });

async function globalTeardown() {
  const uri = process.env.MONGODB_URI!;
  await mongoose.connect(uri);

  const stateFile = path.resolve(__dirname, 'seed-state.json');
  if (!fs.existsSync(stateFile)) {
    console.warn('[E2E Teardown] seed-state.json not found — skipping cleanup.');
    await mongoose.disconnect();
    return;
  }

  const state = JSON.parse(fs.readFileSync(stateFile, 'utf8'));
  const db = mongoose.connection.db!;

  const toObjectId = (id: string) => new mongoose.Types.ObjectId(id);

  // Delete in dependency order (children first)
  if (state.menuItemIds?.length) {
    await db.collection('menuitems').deleteMany({
      _id: { $in: state.menuItemIds.map(toObjectId) },
    });
  }

  if (state.categoryIds?.length) {
    await db.collection('categories').deleteMany({
      _id: { $in: state.categoryIds.map(toObjectId) },
    });
  }

  if (state.tableId) {
    await db.collection('tables').deleteOne({ _id: toObjectId(state.tableId) });
  }

  if (state.restaurantId) {
    // Clean up feature flags
    await db.collection('featureflags').deleteMany({
      restaurantId: toObjectId(state.restaurantId),
    });

    // Clean up restaurant_staff
    await db.collection('restaurant_staff').deleteMany({
      restaurantId: toObjectId(state.restaurantId),
    });

    // Clean up any E2E-placed orders
    await db.collection('orders').deleteMany({
      restaurantId: toObjectId(state.restaurantId),
    });

    // Clean up tablesessions
    await db.collection('tablesessions').deleteMany({
      restaurantId: toObjectId(state.restaurantId),
    });

    await db.collection('restaurants').deleteOne({ _id: toObjectId(state.restaurantId) });
  }

  if (state.userId) {
    await db.collection('users').deleteOne({ _id: toObjectId(state.userId) });
    // Clean up refresh tokens
    await db.collection('refreshtokens').deleteMany({ userId: toObjectId(state.userId) });
  }

  // Remove seed state file
  fs.unlinkSync(stateFile);

  console.log('[E2E Teardown] All seeded test data removed successfully.');
  await mongoose.disconnect();
}

export default globalTeardown;
