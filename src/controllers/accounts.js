const Account = require('../models/Account');
const User = require('../models/User');
const Transaction = require('../models/Transaction');

// @desc    Get all accounts
// @route   GET /api/accounts
// @access  Private/Admin
exports.getAccounts = async (req, res, next) => {
  try {
    let query;
    
    // If user is parent, they can see their children's accounts
    if (req.query.userId) {
      query = Account.find({ owner: req.query.userId });
    } else {
      query = Account.find();
    }
    
    const accounts = await query.populate('owner');
    
    res.status(200).json({
      success: true,
      count: accounts.length,
      data: accounts
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get single account
// @route   GET /api/accounts/:id
// @access  Private
exports.getAccount = async (req, res, next) => {
  try {
    const account = await Account.findById(req.params.id).populate({
      path: 'transactions',
      options: { sort: { date: -1 } }
    });
    
    if (!account) {
      return res.status(404).json({
        success: false,
        error: 'Account not found'
      });
    }

    res.status(200).json({
      success: true,
      data: account
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Create account
// @route   POST /api/accounts
// @access  Private/Admin
exports.createAccount = async (req, res, next) => {
  try {
    // Verify owner exists
    const user = await User.findById(req.body.owner);
    if (!user) {
      return res.status(400).json({
        success: false,
        error: 'User not found'
      });
    }
    
    const account = await Account.create(req.body);
    
    // If this is a savings or donation account with interest rate > 0, 
    // trigger interest recurring transaction creation
    if ((account.type === 'saving' || account.type === 'donation') && account.interestRate > 0) {
      try {
        const interestService = require('../services/interestService');
        await interestService.createInterestRecurringTransactions();
      } catch (error) {
        console.error('Error creating interest recurring transaction for new account:', error);
        // Don't fail the account creation if interest setup fails
      }
    }
    
    res.status(201).json({
      success: true,
      data: account
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Update account
// @route   PUT /api/accounts/:id
// @access  Private/Admin
exports.updateAccount = async (req, res, next) => {
  try {
    const account = await Account.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    });
    
    if (!account) {
      return res.status(404).json({
        success: false,
        error: 'Account not found'
      });
    }

    // If this is a savings or donation account, update interest recurring transactions
    if (account.type === 'saving' || account.type === 'donation') {
      try {
        const interestService = require('../services/interestService');
        await interestService.createInterestRecurringTransactions();
      } catch (error) {
        console.error('Error updating interest recurring transaction for account:', error);
        // Don't fail the account update if interest setup fails
      }
    }

    res.status(200).json({
      success: true,
      data: account
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Delete account
// @route   DELETE /api/accounts/:id
// @access  Private/Admin
exports.deleteAccount = async (req, res, next) => {
  try {
    const account = await Account.findById(req.params.id);
    
    if (!account) {
      return res.status(404).json({
        success: false,
        error: 'Account not found'
      });
    }

    await Account.findByIdAndDelete(req.params.id);

    res.status(200).json({
      success: true,
      data: {}
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Recalculate account balance based on transactions
// @route   POST /api/accounts/:id/recalculate
// @access  Private/Admin
exports.recalculateBalance = async (req, res, next) => {
  try {
    const account = await Account.findById(req.params.id);
    
    if (!account) {
      return res.status(404).json({
        success: false,
        error: 'Account not found'
      });
    }

    // Get all approved transactions that are not rejected and not deleted
    const transactions = await Transaction.find({
      account: account._id,
      approved: true,
      rejected: { $ne: true },
      deleted: { $ne: true }
    });

    // Calculate balance from transactions
    let calculatedBalance = 0;
    transactions.forEach(transaction => {
      if (transaction.type === 'deposit' || transaction.type === 'interest') {
        calculatedBalance += transaction.amount;
      } else if (transaction.type === 'withdrawal' || transaction.type === 'subscription') {
        calculatedBalance -= transaction.amount;
      }
    });

    // Update account balance
    account.balance = calculatedBalance;
    await account.save();

    res.status(200).json({
      success: true,
      message: 'Account balance recalculated successfully',
      data: {
        accountId: account._id,
        oldBalance: req.body.oldBalance || 'unknown',
        newBalance: calculatedBalance,
        transactionCount: transactions.length
      }
    });
  } catch (err) {
    next(err);
  }
};
