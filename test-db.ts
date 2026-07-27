import mongoose from 'mongoose';
import Table from './src/models/Table';
import * as dotenv from 'dotenv';
dotenv.config({ path: './.env' });

async function run() {
  await mongoose.connect(process.env.MONGODB_URI as string);
  console.log("Connected");
  const tables = await Table.find({ isArchived: false }).limit(5);
  console.log("Not archived tables:", tables);
  process.exit(0);
}
run().catch(console.error);
