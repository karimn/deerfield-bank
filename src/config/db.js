const mongoose = require('mongoose');

const connectDB = async () => {
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
    
    // Connect with options to bypass strict validation
    const conn = await mongoose.connect(mongoUri, {
      autoIndex: true, // Build indexes
      maxPoolSize: 10, // Maintain up to 10 socket connections
      connectTimeoutMS: 10000, // Give up initial connection after 10 seconds
      socketTimeoutMS: 45000, // Close sockets after 45 seconds of inactivity
    });
    
    console.log(`MongoDB Connected (${process.env.NODE_ENV}): ${conn.connection.host}`);
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
};

module.exports = connectDB;

