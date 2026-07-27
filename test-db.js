const mongoose = require('mongoose');
const Table = require('./src/models/Table').default;
require('dotenv').config({ path: './.env' });

async function run() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log("Connected");
  const tables = await mongoose.model('Table').find({});
  console.log("All tables:", tables);
  process.exit(0);
}
run().catch(console.error);
