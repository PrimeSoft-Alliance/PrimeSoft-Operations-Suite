import mongoose from 'mongoose';
import { Client } from './src/api/models.js';

async function run() {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/test');
  const indexes = await mongoose.connection.db.collection('clients').indexes();
  console.log(indexes);
  process.exit(0);
}
run();
