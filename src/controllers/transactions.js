const Transaction = require('../models/Transaction');
const Account = require('../models/Account');

// @desc    Get all transactions
// @route   GET /api/transactions
// @access  Private
exports.getTransactions = async (req, res, next) => {
  try {
    let query;
    
    // Filter by account if provided
    if (req.query.accountId) {
      query = Transaction.find({ account: req.query.accountId });
    } else {
      query = Transaction.find();
    }
    
    // Add sort, populate
    query = query.sort('-date').populate('account');
    
    const transactions = await query;
    
    res.status(200).json({
      success: true,
      count: transactions.length,
      data: transactions
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get single transaction
// @route   GET /api/transactions/:id
// @access  Private
exports.getTransaction = async (req, res, next) => {
  try {
    const transaction = await Transaction.findById(req.params.id)
      .populate('account')
      .populate('approvedBy', 'name email');
    
    if (!transaction) {
      return res.status(404).json({
        success: false,
        error: 'Transaction not found'
      });
    }

    res.status(200).json({
      success: true,
      data: transaction
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Create transaction
// @route   POST /api/transactions
// @access  Private
exports.createTransaction = async (req, res, next) => {
  try {
    // Check if account exists
    const account = await Account.findById(req.body.account);
    if (!account) {
      return res.status(404).json({
        success: false,
        error: 'Account not found'
      });
    }
    
    // Create transaction
    const transaction = await Transaction.create(req.body);
    
    // Update account balance based on transaction type
    if (transaction.approved) {
      let newBalance = account.balance;
      
      if (transaction.type === 'deposit' || transaction.type === 'interest') {
        newBalance += transaction.amount;
      } else if (transaction.type === 'withdrawal' || transaction.type === 'subscription') {
        newBalance -= transaction.amount;
      }
      
      // Update account balance
      await Account.findByIdAndUpdate(account._id, { balance: newBalance });
    }
    
    res.status(201).json({
      success: true,
      data: transaction
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Update transaction (mainly for approval)
// @route   PUT /api/transactions/:id
// @access  Private/Admin
exports.updateTransaction = async (req, res, next) => {
  try {
    let transaction = await Transaction.findById(req.params.id);
    
    if (!transaction) {
      return res.status(404).json({
        success: false,
        error: 'Transaction not found'
      });
    }
    
    // Handle approval process specially
    if (req.body.approved === true && transaction.approved === false) {
      const account = await Account.findById(transaction.account);
      
      let newBalance = account.balance;
      
      if (transaction.type === 'deposit' || transaction.type === 'interest') {
        newBalance += transaction.amount;
      } else if (transaction.type === 'withdrawal' || transaction.type === 'subscription') {
        newBalance -= transaction.amount;
      }
      
      // Update account balance
      await Account.findByIdAndUpdate(account._id, { balance: newBalance });
    }
    
    // Update transaction
    transaction = await Transaction.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    });

    res.status(200).json({
      success: true,
      data: transaction
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Delete transaction
// @route   DELETE /api/transactions/:id
// @access  Private/Admin
exports.deleteTransaction = async (req, res, next) => {
  try {
    const transaction = await Transaction.findById(req.params.id);
    
    if (!transaction) {
      return res.status(404).json({
        success: false,
        error: 'Transaction not found'
      });
    }
    
    // If transaction is approved, update account balance
    if (transaction.approved) {
      const account = await Account.findById(transaction.account);
      
      let newBalance = account.balance;
      
      // Reverse the original transaction effect
      if (transaction.type === 'deposit' || transaction.type === 'interest') {
        newBalance -= transaction.amount;
      } else if (transaction.type === 'withdrawal' || transaction.type === 'subscription') {
        newBalance += transaction.amount;
      }
      
      // Update account balance
      await Account.findByIdAndUpdate(account._id, { balance: newBalance });
    }
    
    await transaction.deleteOne();

    res.status(200).json({
      success: true,
      data: {}
    });
  } catch (err) {
    next(err);
  }
};