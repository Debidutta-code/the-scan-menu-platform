import mongoose from 'mongoose';
import * as dotenv from 'dotenv';
dotenv.config({ path: './.env' });
import Table from './src/models/Table';

async function run() {
  await mongoose.connect(process.env.MONGODB_URI as string);
  console.log("Connected");
  const tables = await Table.find({});
  console.log("All tables count:", tables.length);
  if (tables.length > 0) {
      console.log("First table:", tables[0]);
  }
  process.exit(0);
}
run().catch(console.error);
