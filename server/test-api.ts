import mongoose from 'mongoose';
import * as dotenv from 'dotenv';
import Table from './src/models/Table';
dotenv.config({ path: './.env' });

async function run() {
  await mongoose.connect(process.env.MONGODB_URI as string);
  console.log("Connected");
  const tables = await Table.find({});
  console.log("All tables in DB:", tables.length);
  if (tables.length > 0) {
      console.log(tables[0]);
  }
  process.exit(0);
}
run().catch(console.error);
