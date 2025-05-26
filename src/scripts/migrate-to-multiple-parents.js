require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('../config/db');
const User = require('../models/User');

console.log('Starting migration to multiple parents...');

const migrateToMultipleParents = async () => {
  try {
    await connectDB();
    console.log('Connected to database');

    // Find all child users that have a parent but no parents array
    const childrenToMigrate = await User.find({
      role: 'child',
      parent: { $exists: true, $ne: null },
      $or: [
        { parents: { $exists: false } },
        { parents: { $size: 0 } }
      ]
    });

    console.log(`Found ${childrenToMigrate.length} children to migrate`);

    let migrated = 0;
    let errors = 0;

    for (const child of childrenToMigrate) {
      try {
        // Move parent to parents array
        if (child.parent && (!child.parents || child.parents.length === 0)) {
          child.parents = [child.parent];
          await child.save();
          migrated++;
          console.log(`✅ Migrated child: ${child.name} (${child.email})`);
        }
      } catch (error) {
        console.error(`❌ Failed to migrate child ${child.name}:`, error.message);
        errors++;
      }
    }

    // Summary
    console.log('\n=== Migration Summary ===');
    console.log(`✅ Successfully migrated: ${migrated} children`);
    console.log(`❌ Errors: ${errors}`);
    
    if (errors === 0) {
      console.log('\n🎉 Migration completed successfully!');
    } else {
      console.log('\n⚠️ Migration completed with some errors. Please check the logs above.');
    }

    // Verification
    console.log('\n=== Verification ===');
    const childrenWithParents = await User.find({
      role: 'child',
      parents: { $exists: true, $not: { $size: 0 } }
    });
    
    const childrenWithLegacyParent = await User.find({
      role: 'child',
      parent: { $exists: true, $ne: null }
    });

    console.log(`Children with parents array: ${childrenWithParents.length}`);
    console.log(`Children with legacy parent field: ${childrenWithLegacyParent.length}`);

    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
};

// Add a confirmation prompt
const readline = require('readline');
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

console.log('⚠️  This migration will move single parent relationships to multiple parent arrays.');
console.log('📋 This is a one-way migration that will modify your database.');
console.log('💾 Please ensure you have a backup of your database before proceeding.\n');

rl.question('Do you want to continue? (yes/no): ', (answer) => {
  if (answer.toLowerCase() === 'yes' || answer.toLowerCase() === 'y') {
    rl.close();
    migrateToMultipleParents();
  } else {
    console.log('Migration cancelled.');
    rl.close();
    process.exit(0);
  }
});