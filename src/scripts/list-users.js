const mongoose = require('mongoose');
const User = require('../models/User');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../../.env') });

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

async function listUsers() {
  try {
    // Find all users and sort by role
    const users = await User.find().sort({ role: 1, email: 1 });
    
    if (users.length === 0) {
      console.log('No users found in the database');
      process.exit(0);
    }

    console.log('=== USER LIST ===');
    console.log(`Total users: ${users.length}\n`);

    // Group users by role
    const parents = users.filter(user => user.role === 'parent');
    const children = users.filter(user => user.role === 'child');

    console.log(`=== PARENTS (${parents.length}) ===`);
    parents.forEach(user => {
      console.log(`ID: ${user._id}`);
      console.log(`Email: ${user.email}`);
      console.log(`Name: ${user.firstName} ${user.lastName}`);
      console.log(`Created: ${user.createdAt}`);
      console.log('---');
    });

    console.log(`\n=== CHILDREN (${children.length}) ===`);
    children.forEach(user => {
      console.log(`ID: ${user._id}`);
      console.log(`Email: ${user.email}`);
      console.log(`Name: ${user.firstName} ${user.lastName}`);
      console.log(`Date of Birth: ${user.dateOfBirth ? user.dateOfBirth.toISOString().split('T')[0] : 'Not set'}`);
      console.log(`Parent ID: ${user.parentId}`);
      console.log(`Created: ${user.createdAt}`);
      console.log('---');
    });

    // Check for duplicate emails
    const emails = {};
    const duplicates = [];

    users.forEach(user => {
      if (emails[user.email]) {
        duplicates.push(user.email);
        emails[user.email]++;
      } else {
        emails[user.email] = 1;
      }
    });

    if (duplicates.length > 0) {
      console.log('\n=== DUPLICATE EMAILS ===');
      duplicates.forEach(email => {
        console.log(`Email: ${email} (${emails[email]} occurrences)`);
        const matches = users.filter(u => u.email === email);
        matches.forEach(match => {
          console.log(`- ID: ${match._id}, Role: ${match.role}, Name: ${match.firstName} ${match.lastName}`);
        });
      });
    } else {
      console.log('\nNo duplicate emails found');
    }

    // Specific check for the problematic email
    const problemEmail = "sofyannaguib@gmail.com";
    const problemUsers = users.filter(u => u.email === problemEmail);
    
    if (problemUsers.length > 0) {
      console.log(`\n=== CHECKING SPECIFIC EMAIL: ${problemEmail} ===`);
      console.log(`Found ${problemUsers.length} users with this email`);
      
      problemUsers.forEach(user => {
        console.log(`ID: ${user._id}`);
        console.log(`Role: ${user.role}`);
        console.log(`Name: ${user.firstName} ${user.lastName}`);
        console.log(`Date of Birth: ${user.dateOfBirth ? user.dateOfBirth.toISOString().split('T')[0] : 'Not set'}`);
        if (user.role === 'child') {
          console.log(`Parent ID: ${user.parentId}`);
        }
        console.log(`Created: ${user.createdAt}`);
        console.log('---');
      });
    }

  } catch (err) {
    console.error('Error listing users:', err);
  } finally {
    mongoose.connection.close();
  }
}

listUsers();