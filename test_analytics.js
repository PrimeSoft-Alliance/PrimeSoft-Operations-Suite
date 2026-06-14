import mongoose from 'mongoose';
import dotenv from 'dotenv';
import axios from 'axios';
dotenv.config();

const visitSchema = new mongoose.Schema({ clientId: String }, { strict: false });
const Visit = mongoose.models.Visit || mongoose.model('Visit', visitSchema);

async function run() {
  await mongoose.connect(process.env.MONGODB_URI);
  const v = await Visit.findOne();
  console.log('Sample Visit clientId:', v?.clientId);
  
  const clientId = v?.clientId || 'b1c6d1d4-86e5-47fe-bb08-b630e2586e3f';
  try {
    const res = await axios.get('http://localhost:3000/v1/analytics', {
       headers: { 'x-client-id': clientId }
    });
    console.log(res.data);
  } catch (err) {
    console.error(err.response?.data || err.message);
  }
  process.exit(0);
}
run();
