const mongoose = require('mongoose');

let mongodInstance = null;

const connectDB = async () => {
  const uri = process.env.MONGODB_URI;

  try {
    if (uri) {
      console.log(`[DB] Attempting connection to specified URI...`);
      await mongoose.connect(uri, {
        serverSelectionTimeoutMS: 4000
      });
      console.log(`[DB] Connected to MongoDB: ${mongoose.connection.host}`);
      return;
    }
  } catch (err) {
    console.warn(`[DB] Primary MongoDB connection failed: ${err.message}`);
  }

  // If URI was not provided or primary connection failed in dev, try in-memory fallback
  try {
    console.log('[DB] Starting embedded in-memory MongoDB fallback...');
    const { MongoMemoryServer } = require('mongodb-memory-server');
    mongodInstance = await MongoMemoryServer.create();
    const memoryUri = mongodInstance.getUri();
    await mongoose.connect(memoryUri);
    console.log(`[DB] Connected to In-Memory MongoDB at ${memoryUri}`);
  } catch (memErr) {
    console.error(`[DB] Critical Error: Unable to establish database connection: ${memErr.message}`);
    process.exit(1);
  }
};

const disconnectDB = async () => {
  try {
    await mongoose.disconnect();
    if (mongodInstance) {
      await mongodInstance.stop();
    }
    console.log('[DB] Disconnected gracefully');
  } catch (err) {
    console.error('[DB] Error during disconnect', err);
  }
};

module.exports = { connectDB, disconnectDB };
