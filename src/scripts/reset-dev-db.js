const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../../.env') });

// Set NODE_ENV to development
process.env.NODE_ENV = 'development';

// Get MongoDB URI for development
const mongoUri = process.env.MONGO_URI_DEV;

if (!mongoUri) {
  console.error('Error: MONGO_URI_DEV environment variable is not defined');
  process.exit(1);
}

// Connect to database
mongoose.connect(mongoUri)
  .then(() => console.log('MongoDB Connected to development database'))
  .catch(err => {
    console.error('Error connecting to MongoDB:', err.message);
    process.exit(1);
  });

// Load models
const User = require('../models/User');
const Account = require('../models/Account');
const Transaction = require('../models/Transaction');
const RecurringTransaction = require('../models/RecurringTransaction');
const Subscription = require('../models/Subscription');

async function resetDatabase() {
  try {
    console.log('Deleting all collections...');
    
    // Delete all collections
    await Promise.all([
      User.deleteMany({}),
      Account.deleteMany({}),
      Transaction.deleteMany({}),
      RecurringTransaction.deleteMany({}),
      Subscription.deleteMany({})
    ]);
    
    console.log('All collections cleared successfully');
    
    // Create a parent user
    console.log('Creating parent user...');
    const parent = new User({
      firstName: 'Karim',
      lastName: 'Naguib',
      name: 'Karim Naguib',
      email: 'karimn2.0@gmail.com',
      role: 'parent',
      googleId: 'placeholder-google-id' // This will be replaced on first login
    });
    
    await parent.save();
    console.log('Parent user created:', parent._id);
    
    // Create a child user
    console.log('Creating child user...');
    const child = new User({
      firstName: 'Sofyan',
      lastName: 'Naguib',
      name: 'Sofyan Naguib',
      email: 'sofyannaguib@gmail.com',
      role: 'child',
      dateOfBirth: '2013-03-12',
      parent: parent._id
    });
    
    await child.save();
    console.log('Child user created:', child._id);
    
    // Create accounts for the child
    console.log('Creating accounts for child...');
    const accountTypes = ['spending', 'saving', 'donation'];
    
    for (const type of accountTypes) {
      const account = new Account({
        name: type.charAt(0).toUpperCase() + type.slice(1),
        type,
        balance: 10.00,
        interestRate: type === 'saving' ? 5 : 0,
        owner: child._id
      });
      
      await account.save();
      console.log(`Created ${type} account:`, account._id);
    }
    
    console.log('Database reset and populated successfully');
  } catch (error) {
    console.error('Error resetting database:', error);
  } finally {
    mongoose.connection.close();
  }
}

// Run the function
resetDatabase()
  .then(() => {
    console.log('Reset script completed');
    process.exit(0);
  })
  .catch(err => {
    console.error('Reset script failed:', err);
    process.exit(1);
  });