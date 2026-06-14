require('dotenv').config();
const mongoose = require('mongoose');

const uri = process.env.MONGODB_URI || process.env.MONGO_URI;
if (!uri) {
  console.error('Missing MONGODB_URI or MONGO_URI in .env');
  process.exit(1);
}

(async () => {
  try {
    console.log('Connecting using:', uri);
    await mongoose.connect(uri, { serverSelectionTimeoutMS: 8000 });
    console.log('✅ Connected to MongoDB');
    process.exit(0);
  } catch (err) {
    console.error('❌ Connection error:', err);
    process.exit(1);
  } finally {
    try {
      await mongoose.disconnect();
    } catch {}
  }
})();

