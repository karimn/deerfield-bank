const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config();

// Set NODE_ENV to production
process.env.NODE_ENV = 'production';

// Get MongoDB URI for production
const mongoUri = process.env.MONGO_URI_PROD;

if (!mongoUri) {
  console.error('Error: MONGO_URI_PROD environment variable is not defined');
  process.exit(1);
}

// Connect to database
mongoose.connect(mongoUri)
  .then(() => console.log('MongoDB Connected to production database'))
  .catch(err => {
    console.error('Error connecting to MongoDB:', err.message);
    process.exit(1);
  });

// Get the User model
const User = require('./src/models/User');

async function checkUser() {
  try {
    // Find a child user
    const users = await User.find({ role: 'child' });
    
    if (users.length === 0) {
      console.log('No child users found');
      return;
    }
    
    // Print out each user with their date of birth
    users.forEach(user => {
      console.log(`User: ${user.name}`);
      console.log(`Email: ${user.email}`);
      console.log(`Date of Birth: ${user.dateOfBirth}`);
      if (user.dateOfBirth) {
        console.log(`Date of Birth (local string): ${new Date(user.dateOfBirth).toLocaleDateString()}`);
        console.log(`Date of Birth (ISO string): ${new Date(user.dateOfBirth).toISOString()}`);
      } else {
        console.log('No date of birth set');
      }
      console.log('-----------------');
    });
  } catch (error) {
    console.error('Error:', error);
  } finally {
    mongoose.connection.close();
  }
}

checkUser();