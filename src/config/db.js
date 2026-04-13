const mongoose = require('mongoose');

const connectDB = async () => {
  // Already connected — return immediately (warm serverless instance)
  if (mongoose.connection.readyState === 1) return;

  // Already connecting — wait for it rather than opening a second connection
  if (mongoose.connection.readyState === 2) {
    return new Promise((resolve, reject) => {
      mongoose.connection.once('connected', resolve);
      mongoose.connection.once('error', reject);
    });
  }

  try {
    // Select MongoDB URI based on environment
    const mongoUri = process.env.NODE_ENV === 'production'
      ? process.env.MONGO_URI_PROD
      : process.env.MONGO_URI_DEV;

    if (!mongoUri) {
      throw new Error(`MongoDB URI for ${process.env.NODE_ENV} environment not defined`);
    }

    // Configure mongoose options
    mongoose.set('strictQuery', false);

    const conn = await mongoose.connect(mongoUri, {
      autoIndex: true,
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 10000, // Fail fast on bad URI / network
      connectTimeoutMS: 10000,
      socketTimeoutMS: 45000,
    });

    console.log(`MongoDB Connected (${process.env.NODE_ENV}): ${conn.connection.host}`);
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
};

module.exports = connectDB;

