const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');
const { parse } = require('csv-parse/sync');

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../../.env') });

// Process command line arguments
const args = process.argv.slice(2);
const env = args[0]?.toLowerCase();
const csvFilePath = args[1];
const userEmail = args[2];

// Validate required arguments
if (!env || !csvFilePath || !userEmail || (env !== 'dev' && env !== 'prod')) {
  console.error('Usage: node import-transactions.js <env> <csv-file-path> <user-email>');
  console.error('Where <env> is either "dev" or "prod"');
  console.error('Example: node import-transactions.js prod ./transactions.csv karimn2.0@gmail.com');
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

// Connect to database with increased timeout
mongoose.connect(mongoUri, {
  serverSelectionTimeoutMS: 30000, // 30 seconds timeout
  connectTimeoutMS: 30000
})
  .then(() => console.log(`MongoDB Connected to ${env} database`))
  .catch(err => {
    console.error('Error connecting to MongoDB:', err.message);
    process.exit(1);
  });

// Get the models
const User = require('../models/User');
const Account = require('../models/Account');
const Transaction = require('../models/Transaction');

// Function to parse currency string to number
const parseCurrency = (currencyStr) => {
  if (!currencyStr) return 0;
  
  // Remove $ and commas
  let cleanStr = currencyStr.replace(/[$,]/g, '').trim();
  
  // Handle parentheses for negative values: (14.99) -> -14.99
  if (cleanStr.startsWith('(') && cleanStr.endsWith(')')) {
    return -parseFloat(cleanStr.substring(1, cleanStr.length - 1));
  }
  
  return parseFloat(cleanStr);
};

// Function to parse date string to Date object
const parseDate = (dateStr) => {
  if (!dateStr) return new Date();
  
  // Try to parse the date
  try {
    // Split by common separators and try to identify format
    const parts = dateStr.split(/[/\-\.]/);
    
    // Check if we have MM/DD/YYYY format
    if (parts.length === 3) {
      const month = parseInt(parts[0], 10) - 1; // JS months are 0-based
      const day = parseInt(parts[1], 10);
      let year = parseInt(parts[2], 10);
      
      // Handle 2-digit years
      if (year < 100) {
        year += year < 50 ? 2000 : 1900;
      }
      
      const date = new Date(year, month, day);
      
      // Validate the date
      if (isNaN(date.getTime())) {
        console.warn(`Invalid date: ${dateStr}, using current date`);
        return new Date();
      }
      
      return date;
    }
  } catch (error) {
    console.warn(`Error parsing date: ${dateStr}, using current date`, error);
  }
  
  // Fall back to standard parsing
  const date = new Date(dateStr);
  
  // If that fails too, return current date
  if (isNaN(date.getTime())) {
    console.warn(`Failed to parse date: ${dateStr}, using current date`);
    return new Date();
  }
  
  return date;
};

// Import transactions from CSV
async function importTransactions() {
  try {
    // Find the user by email
    const user = await User.findOne({ email: userEmail });
    if (!user) {
      throw new Error(`User not found with email: ${userEmail}`);
    }
    console.log(`Found user: ${user.name} (${user._id})`);

    // Find all accounts for this user
    const accounts = await Account.find({ owner: user._id });
    if (accounts.length === 0) {
      throw new Error(`No accounts found for user: ${userEmail}`);
    }

    // Map account types to their IDs
    const accountMap = {};
    accounts.forEach(account => {
      accountMap[account.type] = account._id;
    });
    console.log('Found accounts:', accountMap);

    // Handle tilde in file path
    const expandedPath = csvFilePath.startsWith('~') 
      ? path.join(process.env.HOME, csvFilePath.substring(1)) 
      : csvFilePath;
      
    console.log(`Reading file from: ${expandedPath}`);
    
    // Read and parse the CSV file
    const fileContent = fs.readFileSync(expandedPath, 'utf8');
    const records = parse(fileContent, {
      columns: true,
      skip_empty_lines: true,
      trim: true
    });
    console.log(`Read ${records.length} records from CSV`);

    // Create transactions
    const transactions = [];
    let skippedRows = 0;

    // Log the first record to debug
    if (records.length > 0) {
      console.log('Sample record:', records[0]);
    }
    
    for (const record of records) {
      console.log(`Processing record with date: ${record.Date}`);
      const date = parseDate(record.Date);
      const note = record.Note || 'Imported transaction';
      
      // Handle spending account
      const spendingAmount = parseCurrency(record.Spending);
      if (spendingAmount !== 0 && accountMap.spending) {
        transactions.push({
          description: note,
          amount: Math.abs(spendingAmount), // Store amount as positive
          type: spendingAmount > 0 ? 'deposit' : 'withdrawal', // Determine type based on sign
          date: date,
          account: accountMap.spending,
          approved: true,
          approvedBy: user._id
        });
      }
      
      // Handle saving account
      const savingAmount = parseCurrency(record.Saving);
      if (savingAmount !== 0 && accountMap.saving) {
        transactions.push({
          description: note,
          amount: Math.abs(savingAmount), // Store amount as positive
          type: savingAmount > 0 ? 'deposit' : 'withdrawal', // Determine type based on sign
          date: date,
          account: accountMap.saving,
          approved: true,
          approvedBy: user._id
        });
      }
      
      // Handle donating account
      const donatingAmount = parseCurrency(record.Donating);
      if (donatingAmount !== 0 && accountMap.donation) {
        transactions.push({
          description: note,
          amount: Math.abs(donatingAmount), // Store amount as positive
          type: donatingAmount > 0 ? 'deposit' : 'withdrawal', // Determine type based on sign
          date: date,
          account: accountMap.donation,
          approved: true,
          approvedBy: user._id
        });
      }
      
      // If no transactions were created from this row
      if (spendingAmount === 0 && savingAmount === 0 && donatingAmount === 0) {
        console.warn(`Skipping row with date ${date} and note "${note}" - no valid amounts`);
        skippedRows++;
      }
    }

    if (transactions.length === 0) {
      console.warn('No valid transactions found in CSV');
      return null;
    }

    console.log(`Created ${transactions.length} transactions from ${records.length - skippedRows} rows`);
    
    // Insert transactions into database
    const result = await Transaction.insertMany(transactions);
    console.log(`Inserted ${result.length} transactions into database`);
    
    // Update account balances
    for (const accountType in accountMap) {
      const accountId = accountMap[accountType];
      const account = await Account.findById(accountId);
      
      // Calculate the total balance change for this account
      let balanceChange = 0;
      transactions
        .filter(t => t.account.toString() === accountId.toString())
        .forEach(t => {
          if (t.type === 'deposit') {
            balanceChange += t.amount;
          } else if (t.type === 'withdrawal') {
            balanceChange -= t.amount;
          }
        });
      
      // Update the balance
      account.balance += balanceChange;
      await account.save();
      console.log(`Updated ${accountType} account balance to ${account.balance}`);
    }
    
    return result;
  } catch (error) {
    console.error('Error importing transactions:', error.message);
    throw error;
  }
}

// Execute and close connection
importTransactions()
  .then((result) => {
    console.log('Script completed successfully');
    if (result) {
      console.log(`Imported ${result.length} transactions`);
    }
    mongoose.connection.close();
    process.exit(0);
  })
  .catch(err => {
    console.error('Script failed:', err);
    mongoose.connection.close();
    process.exit(1);
  });