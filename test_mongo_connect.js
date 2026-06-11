require('dotenv').config();
const mongoose = require('mongoose');

const uri = process.env.MONGODB_URI;
if (!uri) {
  console.error('Missing MONGODB_URI');
  process.exit(1);
}

(async () => {
  try {
    console.log('Connecting using:', uri);
    await mongoose.connect(uri, { serverSelectionTimeoutMS: 8000 });
    console.log('✅ Connected to MongoDB');
    process.exit(0);
  } catch (err) {
    console.error('❌ Connection error:', err.code, err.syscall, err.hostname);
    process.exit(1);
  } finally {
    try {
      await mongoose.disconnect();
    } catch {}
  }
})();

