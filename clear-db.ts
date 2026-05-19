import mongoose from 'mongoose';
import { Booking, Contact, Lead, Client, Form } from './src/api/models';
import dotenv from 'dotenv';
dotenv.config();

async function run() {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/aistudio_apps');
  await Form.deleteMany({});
  await Lead.deleteMany({});
  await Booking.deleteMany({});
  await Contact.deleteMany({});
  console.log('Cleared forms, leads, bookings, contacts');
  process.exit(0);
}
run();
