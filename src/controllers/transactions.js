const Transaction = require('../models/Transaction');
const Account = require('../models/Account');

// @desc    Get all transactions with pagination and filtering
// @route   GET /api/transactions
// @access  Private
exports.getTransactions = async (req, res, next) => {
  try {
    // Build filter object
    let filter = {};
    
    // Filter by account if provided
    if (req.query.accountId) {
      filter.account = req.query.accountId;
    }
    
    // Filter by user's accounts (ensure users only see their transactions)
    if (req.query.userId) {
      const Account = require('../models/Account');
      const userAccounts = await Account.find({ owner: req.query.userId });
      const accountIds = userAccounts.map(account => account._id);
      filter.account = { $in: accountIds };
    } else {
      // If no userId provided, get transactions for current user and their children
      const User = require('../models/User');
      const currentUser = req.user; // Assuming req.user is set by auth middleware
      
      if (currentUser) {
        let accountOwners = [currentUser._id];
        
        // If user is a parent, include their children's accounts (multiple parent support)
        if (currentUser.role === 'parent') {
          const children = await User.findChildrenOfParent(currentUser._id);
          accountOwners = accountOwners.concat(children.map(child => child._id));
        }
        
        const userAccounts = await Account.find({ owner: { $in: accountOwners } });
        const accountIds = userAccounts.map(account => account._id);
        filter.account = { $in: accountIds };
      }
    }
    
    // Filter by transaction type
    if (req.query.type) {
      filter.type = req.query.type;
    }
    
    // Filter by date range
    if (req.query.startDate || req.query.endDate) {
      filter.date = {};
      if (req.query.startDate) {
        filter.date.$gte = new Date(req.query.startDate);
      }
      if (req.query.endDate) {
        filter.date.$lte = new Date(req.query.endDate);
      }
    }
    
    // Filter by description (case-insensitive search)
    if (req.query.search) {
      filter.description = { $regex: req.query.search, $options: 'i' };
    }
    
    // Filter by approval status
    if (req.query.approved !== undefined) {
      filter.approved = req.query.approved === 'true';
    }
    
    // Filter by rejection status
    if (req.query.rejected !== undefined) {
      filter.rejected = req.query.rejected === 'true';
    }
    
    // Filter by deleted status
    if (req.query.deleted !== undefined) {
      filter.deleted = req.query.deleted === 'true';
    }
    
    // If no specific rejected filter and no approval filter, exclude rejected transactions
    if (req.query.rejected === undefined && req.query.includeRejected !== 'true') {
      filter.rejected = { $ne: true };
    }
    
    // If no specific deleted filter, exclude deleted transactions unless explicitly requested
    if (req.query.deleted === undefined && req.query.includeDeleted !== 'true') {
      filter.deleted = { $ne: true };
    }
    
    // Pagination
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 25;
    const startIndex = (page - 1) * limit;
    
    // Execute query with pagination
    const total = await Transaction.countDocuments(filter);
    const transactions = await Transaction.find(filter)
      .sort('-date')
      .populate('account')
      .populate('approvedBy', 'name email')
      .skip(startIndex)
      .limit(limit);
    
    // Manually populate account owners to ensure it works
    for (let transaction of transactions) {
      if (transaction.account && transaction.account.owner) {
        await transaction.account.populate('owner', 'name firstName lastName');
      }
    }
    
    // Pagination info
    const pagination = {};
    if (startIndex > 0) {
      pagination.prev = {
        page: page - 1,
        limit
      };
    }
    if (startIndex + limit < total) {
      pagination.next = {
        page: page + 1,
        limit
      };
    }
    
    res.status(200).json({
      success: true,
      count: transactions.length,
      total,
      pagination,
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

// @desc    Reject transaction (instead of deleting)
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
    
    // If transaction is already rejected, return error
    if (transaction.rejected) {
      return res.status(400).json({
        success: false,
        error: 'Transaction is already rejected'
      });
    }
    
    // If transaction is approved, update account balance (reverse the effect)
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
    
    // Mark transaction as rejected instead of deleting
    const updatedTransaction = await Transaction.findByIdAndUpdate(
      req.params.id,
      {
        rejected: true,
        rejectedBy: req.user.id,
        rejectedAt: new Date(),
        approved: false // Ensure it's not approved if it was
      },
      { new: true }
    );

    res.status(200).json({
      success: true,
      message: 'Transaction rejected successfully',
      data: updatedTransaction
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Delete transaction (mark as deleted)
// @route   DELETE /api/transactions/:id/delete
// @access  Private/Parent
exports.markTransactionDeleted = async (req, res, next) => {
  try {
    const transaction = await Transaction.findById(req.params.id);
    
    if (!transaction) {
      return res.status(404).json({
        success: false,
        error: 'Transaction not found'
      });
    }
    
    // Check if user is authorized (must be parent)
    if (req.user.role !== 'parent') {
      return res.status(403).json({
        success: false,
        error: 'Only parents can delete transactions'
      });
    }
    
    // If transaction is already deleted, return error
    if (transaction.deleted) {
      return res.status(400).json({
        success: false,
        error: 'Transaction is already deleted'
      });
    }
    
    // If transaction is approved and not rejected, update account balance (reverse the effect)
    if (transaction.approved && !transaction.rejected) {
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
    
    // Mark transaction as deleted
    const updatedTransaction = await Transaction.findByIdAndUpdate(
      req.params.id,
      {
        deleted: true,
        deletedBy: req.user.id,
        deletedAt: new Date()
      },
      { new: true }
    );

    res.status(200).json({
      success: true,
      message: 'Transaction deleted successfully',
      data: updatedTransaction
    });
  } catch (err) {
    next(err);
  }
};