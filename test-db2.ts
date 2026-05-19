import mongoose from 'mongoose';
import { Booking, Contact, Lead } from './src/api/models';
import dotenv from 'dotenv';
dotenv.config();

async function run() {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/aistudio_apps');
  const b = await Booking.find({});
  const c = await Contact.find({});
  const l = await Lead.find({});
  console.log('Bookings:', b);
  console.log('Contacts:', c);
  console.log('Leads:', l);
  process.exit(0);
}
run();
