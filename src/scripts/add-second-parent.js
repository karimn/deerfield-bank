require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('../config/db');
const User = require('../models/User');

console.log('Adding second parent for Sofyan...');

const addSecondParent = async () => {
  try {
    await connectDB();
    console.log('Connected to database');

    // First, find Sofyan
    const sofyan = await User.findOne({ 
      $or: [
        { name: /sofyan/i },
        { firstName: /sofyan/i },
        { email: /sofyan/i }
      ],
      role: 'child'
    });

    if (!sofyan) {
      console.error('❌ Could not find child user Sofyan');
      process.exit(1);
    }

    console.log(`✅ Found Sofyan: ${sofyan.name} (${sofyan.email})`);

    // Check if Marcella already exists
    let marcella = await User.findOne({ email: 'mbombardieri@gmail.com' });

    if (marcella) {
      console.log(`✅ Found existing user Marcella: ${marcella.name}`);
      
      // Check if Marcella is already a parent of Sofyan
      if (sofyan.hasParent(marcella._id)) {
        console.log('ℹ️  Marcella is already a parent of Sofyan');
        process.exit(0);
      }
    } else {
      // Create Marcella as a new parent user
      console.log('Creating new parent user: Marcella Bombardieri');
      
      marcella = await User.create({
        name: 'Marcella Bombardieri',
        firstName: 'Marcella',
        lastName: 'Bombardieri', 
        email: 'mbombardieri@gmail.com',
        role: 'parent'
      });
      
      console.log(`✅ Created new parent: ${marcella.name} (${marcella.email})`);
    }

    // Add Marcella as a parent to Sofyan
    console.log('Adding Marcella as parent to Sofyan...');
    await sofyan.addParent(marcella._id);

    // Verify the relationship
    const updatedSofyan = await User.findById(sofyan._id);
    const allParents = updatedSofyan.getAllParents();
    
    console.log('\n=== Verification ===');
    console.log(`Sofyan now has ${allParents.length} parent(s):`);
    
    for (const parentId of allParents) {
      const parent = await User.findById(parentId);
      console.log(`  - ${parent.name} (${parent.email})`);
    }

    console.log('\n🎉 Successfully added Marcella as second parent for Sofyan!');
    console.log('Both parents can now:');
    console.log('  - Manage Sofyan\'s accounts');
    console.log('  - Approve transactions');
    console.log('  - Set up allowances');
    console.log('  - View transaction history');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error adding second parent:', error.message);
    process.exit(1);
  }
};

addSecondParent();