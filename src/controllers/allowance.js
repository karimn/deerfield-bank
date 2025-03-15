// src/controllers/allowance.js

const User = require('../models/User');
const Account = require('../models/Account');
const Transaction = require('../models/Transaction');

// @desc    Process weekly allowance
// @route   POST /api/allowance/process
// @access  Private/Admin
exports.processAllowance = async (req, res, next) => {
  try {
    // Find all child users
    const children = await User.find({ role: 'child' });
    
    const results = [];
    
    // Process allowance for each child
    for (const child of children) {
      // Get the allowance amount and distribution from the request or use defaults
      const { amount = 10, distribution = { spending: 34, saving: 33, donation: 33 } } = req.body;
      
      // Get child's accounts
      const accounts = await Account.find({ owner: child._id });
      
      // Distribute allowance to accounts
      for (const account of accounts) {
        let shareAmount = 0;
        
        if (account.type === 'spending' && distribution.spending) {
          shareAmount = (amount * distribution.spending) / 100;
        } else if (account.type === 'saving' && distribution.saving) {
          shareAmount = (amount * distribution.saving) / 100;
        } else if (account.type === 'donation' && distribution.donation) {
          shareAmount = (amount * distribution.donation) / 100;
        }
        
        if (shareAmount > 0) {
          // Create transaction
          const transaction = await Transaction.create({
            description: 'Weekly Allowance',
            amount: shareAmount,
            type: 'deposit',
            account: account._id,
            approved: true
          });
          
          results.push(transaction);
          
          // Update account balance
          await Account.findByIdAndUpdate(account._id, {
            balance: account.balance + shareAmount
          });
        }
      }
    }
    
    res.status(200).json({
      success: true,
      count: results.length,
      data: results
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Calculate monthly interest
// @route   POST /api/interest/calculate
// @access  Private/Admin
exports.calculateInterest = async (req, res, next) => {
  try {
    // Find all accounts with interest rate > 0
    const accounts = await Account.find({ interestRate: { $gt: 0 } });
    
    const results = [];
    
    // Calculate interest for each account
    for (const account of accounts) {
      // Calculate interest amount (simple interest)
      const interestAmount = (account.balance * account.interestRate) / 100 / 12; // Monthly interest
      
      if (interestAmount > 0) {
        // Create transaction
        const transaction = await Transaction.create({
          description: 'Monthly Interest',
          amount: interestAmount,
          type: 'interest',
          account: account._id,
          approved: true
        });
        
        results.push(transaction);
        
        // Update account balance
        await Account.findByIdAndUpdate(account._id, {
          balance: account.balance + interestAmount
        });
      }
    }
    
    res.status(200).json({
      success: true,
      count: results.length,
      data: results
    });
  } catch (err) {
    next(err);
  }
};