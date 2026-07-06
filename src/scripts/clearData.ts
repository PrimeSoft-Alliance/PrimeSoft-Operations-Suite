import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/ominirep';

async function clearDatabase() {
  console.log('Connecting to database...');
  await mongoose.connect(mongoUri);
  console.log('Connected successfully.');

  const dbNames = ['test', 'OminiRep'];
  const collectionsToClear = [
    'contacts',
    'leads',
    'ailogs',
    'conversations',
    'unifiedmessages',
    'inquiries',
    'tickets',
    'bookings'
  ];

  for (const dbName of dbNames) {
    console.log(`Clearing collections in database: "${dbName}"...`);
    const dbConnection = mongoose.connection.useDb(dbName);
    const dbInstance = dbConnection.db;

    if (!dbInstance) {
      console.log(`Could not obtain db instance for "${dbName}"`);
      continue;
    }

    for (const colName of collectionsToClear) {
      try {
        const collection = dbInstance.collection(colName);
        const count = await collection.countDocuments({});
        if (count > 0) {
          const res = await collection.deleteMany({});
          console.log(`[${dbName}] Cleared ${res.deletedCount} documents from collection: "${colName}"`);
        } else {
          console.log(`[${dbName}] Collection "${colName}" is already empty.`);
        }
      } catch (err: any) {
        console.log(`[${dbName}] Skipped or errored on collection "${colName}":`, err.message);
      }
    }
  }

  await mongoose.disconnect();
  console.log('Database disconnected. All specified collections cleared successfully!');
}

clearDatabase().catch(err => {
  console.error('Error clearing database:', err);
  process.exit(1);
});
