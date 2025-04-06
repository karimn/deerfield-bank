const mongoose = require('mongoose');
const dotenv = require('dotenv');

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

// Process command line arguments
// Expected format: node update-dob.js email@example.com YYYY-MM-DD
const args = process.argv.slice(2);
const email = args[0];
const dobString = args[1];

if (!email || !dobString) {
  console.error('Usage: node update-dob.js <email> <YYYY-MM-DD>');
  console.error('Example: node update-dob.js child@example.com 2010-05-15');
  process.exit(1);
}

// Validate date format
const datePattern = /^\d{4}-\d{2}-\d{2}$/;
if (!datePattern.test(dobString)) {
  console.error('Error: Date must be in YYYY-MM-DD format');
  process.exit(1);
}

// Create date object for the provided date
const dob = new Date(dobString);
if (isNaN(dob.getTime())) {
  console.error('Error: Invalid date format. Please use YYYY-MM-DD');
  process.exit(1);
}

async function updateDateOfBirth() {
  try {
    // Find the user by email
    const user = await User.findOne({ email });
    
    if (!user) {
      console.error(`User with email ${email} not found`);
      return;
    }
    
    console.log(`Found user: ${user.name} (${user._id})`);
    console.log(`Current Date of Birth: ${user.dateOfBirth ? new Date(user.dateOfBirth).toISOString().split('T')[0] : 'Not set'}`);
    
    // Update the date of birth
    user.dateOfBirth = dob;
    await user.save();
    
    console.log(`Updated Date of Birth to: ${new Date(user.dateOfBirth).toISOString().split('T')[0]}`);
    console.log('Update successful!');
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    mongoose.connection.close();
  }
}

updateDateOfBirth();