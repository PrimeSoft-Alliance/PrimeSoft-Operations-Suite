import mongoose from 'mongoose';
import { Client, Contact, Booking, OnboardingRequest } from './src/api/models';

async function run() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('MONGODB_URI env var is not set');
    process.exit(1);
  }
  
  await mongoose.connect(uri);
  console.log('--- MongoDB Connection Successful ---');
  
  const clients = await Client.find({}, { clientId: 1, email: 1, businessName: 1 });
  console.log(`\nFound ${clients.length} Clients:`);
  console.log(JSON.stringify(clients, null, 2));

  const contacts = await Contact.find({}, { clientId: 1, email: 1, name: 1, subject: 1, createdAt: 1 });
  console.log(`\nFound ${contacts.length} Contacts (Inquiries):`);
  console.log(JSON.stringify(contacts, null, 2));

  const bookings = await Booking.find({}, { clientId: 1, customerEmail: 1, status: 1 });
  console.log(`\nFound ${bookings.length} Bookings:`);
  console.log(JSON.stringify(bookings, null, 2));

  const onboarding = await OnboardingRequest.find({}, { businessName: 1, email: 1, status: 1 });
  console.log(`\nFound ${onboarding.length} Onboarding Requests:`);
  console.log(JSON.stringify(onboarding, null, 2));

  process.exit(0);
}
run().catch(console.error);
