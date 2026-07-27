import mongoose from 'mongoose';
import * as dotenv from 'dotenv';
dotenv.config({ path: './.env' });
import Table from './src/models/Table';

async function run() {
  await mongoose.connect(process.env.MONGODB_URI as string);
  console.log("Connected");
  const tables = await Table.find({ isArchived: { $ne: true } }).limit(5);
  console.log("Not archived tables:", tables);
  process.exit(0);
}
run().catch(console.error);
