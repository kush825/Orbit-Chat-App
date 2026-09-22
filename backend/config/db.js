const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/chatapp';
    console.log(`Connecting to MongoDB at ${mongoUri}...`);
    
    // Set connection timeout
    await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 15000,
    });
    console.log(`MongoDB Connected successfully!`);
  } catch (error) {
    console.warn(`Local MongoDB connection failed (${error.message}). Starting MongoMemoryServer fallback...`);
    try {
      const { MongoMemoryServer } = require('mongodb-memory-server');
      const mongoServer = await MongoMemoryServer.create();
      const memoryUri = mongoServer.getUri();
      await mongoose.connect(memoryUri);
      console.log(`Connected to in-memory MongoDB Server at ${memoryUri}`);
    } catch (memErr) {
      console.error(`MongoDB connection error: ${memErr.message}`);
      process.exit(1);
    }
  }
};

module.exports = connectDB;
