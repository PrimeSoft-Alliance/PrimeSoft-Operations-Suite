import mongoose from 'mongoose';
import { Booking, Contact, Client } from './src/api/models';

async function debug() {
  await mongoose.connect(process.env.MONGODB_URI!);
  console.log('Connected to DB');
  
  const p001Bookings = await Booking.find({ clientId: 'plumber-001' });
  console.log('Bookings for plumber-001:', p001Bookings.length);
  
  const p001Contacts = await Contact.find({ clientId: 'plumber-001' });
  console.log('Contacts for plumber-001:', p001Contacts.length);

  const clients = await Client.find({}).limit(10);
  console.log('Total clients:', await Client.countDocuments({}));
  console.log('Sample clients:', JSON.stringify(clients, null, 2));

  process.exit(0);
}

debug();
