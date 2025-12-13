const Account = require('../models/Account');
const RecurringTransaction = require('../models/RecurringTransaction');
const User = require('../models/User');

/**
 * Creates or updates automatic interest recurring transactions for savings and donation accounts
 * This should be called whenever an account is created or when interest rates change
 */
async function createInterestRecurringTransactions() {
  try {
    // Find all savings and donation accounts with interest rates > 0
    const accounts = await Account.find({
      type: { $in: ['saving', 'donation'] },
      interestRate: { $gt: 0 }
    }).populate('owner');

    console.log(`Found ${accounts.length} accounts eligible for interest`);

    for (const account of accounts) {
      // Check if an interest recurring transaction already exists for this account
      const existingInterest = await RecurringTransaction.findOne({
        account: account._id,
        type: 'interest',
        name: 'Monthly Interest'
      });

      // Calculate monthly interest amount based on current balance
      const monthlyInterestRate = account.interestRate / 100 / 12; // Convert annual % to monthly decimal
      const monthlyInterestAmount = account.balance * monthlyInterestRate;

      if (existingInterest) {
        // Update existing recurring transaction with new amount
        await RecurringTransaction.findByIdAndUpdate(existingInterest._id, {
          amount: monthlyInterestAmount,
          active: account.balance > 0 // Only active if there's a balance
        });
        console.log(`Updated interest for account ${account.name}: $${monthlyInterestAmount.toFixed(2)}/month`);
      } else {
        // Create new recurring transaction
        if (monthlyInterestAmount > 0) {
          // Calculate next month's date (1st of next month)
          const nextDate = new Date();
          nextDate.setMonth(nextDate.getMonth() + 1);
          nextDate.setDate(1);
          nextDate.setHours(0, 0, 0, 0);

          await RecurringTransaction.create({
            name: 'Monthly Interest',
            description: `${account.interestRate}% annual interest for ${account.name}`,
            amount: monthlyInterestAmount,
            type: 'interest',
            frequency: 'monthly',
            account: account._id,
            user: account.owner._id,
            createdBy: account.owner._id, // System created, but assign to owner
            nextDate: nextDate,
            active: true
          });
          console.log(`Created interest for account ${account.name}: $${monthlyInterestAmount.toFixed(2)}/month`);
        }
      }
    }

    // Deactivate interest transactions for accounts that no longer qualify
    await deactivateInvalidInterestTransactions();

    return { success: true, processed: accounts.length };
  } catch (error) {
    console.error('Error creating interest recurring transactions:', error);
    throw error;
  }
}

/**
 * Deactivates interest recurring transactions for accounts that no longer qualify
 */
async function deactivateInvalidInterestTransactions() {
  try {
    // Find all interest recurring transactions
    const interestTransactions = await RecurringTransaction.find({
      type: 'interest',
      active: true
    }).populate('account');

    for (const transaction of interestTransactions) {
      const account = transaction.account;
      
      // Deactivate if account doesn't exist, wrong type, no interest rate, or zero balance
      if (!account || 
          !['saving', 'donation'].includes(account.type) || 
          account.interestRate <= 0 || 
          account.balance <= 0) {
        
        await RecurringTransaction.findByIdAndUpdate(transaction._id, {
          active: false
        });
        console.log(`Deactivated interest transaction for account ${account?.name || 'unknown'}`);
      }
    }
  } catch (error) {
    console.error('Error deactivating invalid interest transactions:', error);
  }
}

/**
 * Updates interest amounts for all active interest recurring transactions
 * Should be called periodically to keep interest amounts current with balance changes
 */
async function updateInterestAmounts() {
  try {
    const interestTransactions = await RecurringTransaction.find({
      type: 'interest',
      active: true
    }).populate('account');

    let updated = 0;

    for (const transaction of interestTransactions) {
      const account = transaction.account;
      
      if (account && account.balance > 0 && account.interestRate > 0) {
        const monthlyInterestRate = account.interestRate / 100 / 12;
        const newAmount = account.balance * monthlyInterestRate;
        
        // Only update if amount has changed significantly (more than 1 cent)
        if (Math.abs(newAmount - transaction.amount) > 0.01) {
          await RecurringTransaction.findByIdAndUpdate(transaction._id, {
            amount: newAmount
          });
          updated++;
          console.log(`Updated interest amount for ${account.name}: $${newAmount.toFixed(2)}/month`);
        }
      }
    }

    return { success: true, updated };
  } catch (error) {
    console.error('Error updating interest amounts:', error);
    throw error;
  }
}

/**
 * Gets all interest recurring transactions (for admin/parent viewing)
 */
async function getInterestTransactions(userId = null, userRole = null) {
  try {
    let query = { type: 'interest' };

    // Filter based on user role and permissions
    if (userRole === 'child') {
      query.user = userId;
    } else if (userRole === 'parent' && userId) {
      // Parents can see their own and their children's interest transactions
      const children = await User.find({ parent: userId });
      const childIds = children.map(child => child._id);
      childIds.push(userId);
      query.user = { $in: childIds };
    }

    const transactions = await RecurringTransaction.find(query)
      .populate('account')
      .populate('user')
      .sort({ nextDate: 1 });

    return transactions;
  } catch (error) {
    console.error('Error getting interest transactions:', error);
    throw error;
  }
}

module.exports = {
  createInterestRecurringTransactions,
  updateInterestAmounts,
  getInterestTransactions,
  deactivateInvalidInterestTransactions
};