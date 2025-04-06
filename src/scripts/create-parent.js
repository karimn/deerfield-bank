const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../../.env') });

// Process command line arguments
const args = process.argv.slice(2);
const env = args[0]?.toLowerCase();
const email = args[1];
const firstName = args[2];
const lastName = args[3];

// Validate required arguments
if (!env || !email || !firstName || (env !== 'dev' && env !== 'prod')) {
  console.error('Usage: node create-parent.js <env> <email> <firstName> [lastName]');
  console.error('Where <env> is either "dev" or "prod"');
  console.error('Example: node create-parent.js prod john.doe@example.com John Doe');
  process.exit(1);
}

// Set NODE_ENV based on argument
process.env.NODE_ENV = env === 'prod' ? 'production' : 'development';

// Get MongoDB URI based on environment
const mongoUri = env === 'prod' ? process.env.MONGO_URI_PROD : process.env.MONGO_URI_DEV;

if (!mongoUri) {
  console.error(`Error: MONGO_URI_${env.toUpperCase()} environment variable is not defined`);
  process.exit(1);
}

// Connect to database
mongoose.connect(mongoUri)
  .then(() => console.log(`MongoDB Connected to ${env} database`))
  .catch(err => {
    console.error('Error connecting to MongoDB:', err.message);
    process.exit(1);
  });

// Get the actual User model
const User = require('../models/User');

// Create the parent user
async function createParentUser() {
  try {
    // Check if user already exists
    const existingUser = await User.findOne({ email });
    
    if (existingUser) {
      console.log('User already exists:', existingUser);
      return existingUser;
    }

    // Create new user
    const fullName = lastName ? `${firstName} ${lastName}` : firstName;
    
    const newUser = new User({
      googleId: 'placeholder-google-id', // This will be replaced on first login
      email,
      name: fullName,
      role: 'parent'
    });

    const savedUser = await newUser.save();
    console.log('Parent user created successfully:', savedUser);
    return savedUser;
  } catch (error) {
    console.error('Error creating parent user:', error.message);
    throw error;
  }
}

// Execute and close connection
createParentUser()
  .then(() => {
    console.log('Script completed successfully');
    mongoose.connection.close();
    process.exit(0);
  })
  .catch(err => {
    console.error('Script failed:', err);
    mongoose.connection.close();
    process.exit(1);
  });