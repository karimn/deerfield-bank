const RecurringTransaction = require('../models/RecurringTransaction');
const Account = require('../models/Account');
const Transaction = require('../models/Transaction');
const User = require('../models/User');
const { canAccessChild, getAccessibleChildren } = require('../utils/parentAuth');

// @desc    Get all recurring transactions
// @route   GET /api/recurring
// @access  Private
exports.getRecurringTransactions = async (req, res, next) => {
  try {
    let query = {};

    // Filter by user (usually for parent viewing their children's transactions)
    if (req.query.userId) {
      query.user = req.query.userId;
    }

    // Filter by type
    if (req.query.type) {
      query.type = req.query.type;
    }

    // For regular users, only show their own transactions
    // For parents, show their own and their children's
    if (req.user.role === 'child') {
      query.user = req.user.id;
    } else if (req.user.role === 'parent') {
      // If no specific user filter was provided, get all children
      if (!req.query.userId) {
        // Find all children of this parent (supports multiple parents)
        const children = await getAccessibleChildren(req.user.id);
        const childIds = children.map(child => child._id);
        // Add parent's own ID
        childIds.push(req.user.id);
        // Filter by all these users
        query.user = { $in: childIds };
      }
    }

    // Get recurring transactions with populated account and user details
    const recurringTransactions = await RecurringTransaction.find(query)
      .populate('account')
      .populate('user')
      .populate('createdBy')
      .sort({ nextDate: 1 });

    res.status(200).json({
      success: true,
      count: recurringTransactions.length,
      data: recurringTransactions
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get single recurring transaction
// @route   GET /api/recurring/:id
// @access  Private
exports.getRecurringTransaction = async (req, res, next) => {
  try {
    const recurringTransaction = await RecurringTransaction.findById(req.params.id)
      .populate('account')
      .populate('user')
      .populate('createdBy');

    if (!recurringTransaction) {
      return res.status(404).json({
        success: false,
        error: 'Recurring transaction not found'
      });
    }

    // Check ownership or parent relationship
    if (req.user.role === 'child' && recurringTransaction.user.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        error: 'Not authorized to access this recurring transaction'
      });
    }

    if (req.user.role === 'parent' && 
        recurringTransaction.user.toString() !== req.user.id) {
      // Check if this recurring transaction belongs to one of their children (multiple parents support)
      const hasAccess = await canAccessChild(req.user.id, recurringTransaction.user);
      if (!hasAccess) {
        return res.status(403).json({
          success: false,
          error: 'Not authorized to access this recurring transaction'
        });
      }
    }

    res.status(200).json({
      success: true,
      data: recurringTransaction
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Create recurring transaction
// @route   POST /api/recurring
// @access  Private
exports.createRecurringTransaction = async (req, res, next) => {
  try {
    const {
      name,
      description,
      amount,
      type,
      frequency,
      account,
      user,
      distribution,
      nextDate,
      active
    } = req.body;

    // Validate input
    if (!name || !amount || !type || !frequency || !account || !nextDate) {
      return res.status(400).json({
        success: false,
        error: 'Please provide all required fields'
      });
    }

    // Check if account exists and belongs to the user
    const accountDoc = await Account.findById(account);
    if (!accountDoc) {
      return res.status(404).json({
        success: false,
        error: 'Account not found'
      });
    }

    // Determine which user this transaction is for
    let targetUser = user || req.user.id;

    // Check permissions (only parents can create for children)
    if (req.user.role === 'child' && targetUser !== req.user.id) {
      return res.status(403).json({
        success: false,
        error: 'Not authorized to create recurring transactions for others'
      });
    }

    if (req.user.role === 'parent' && targetUser !== req.user.id) {
      // Check if this is their child (multiple parents support)
      const hasAccess = await canAccessChild(req.user.id, targetUser);
      if (!hasAccess) {
        return res.status(403).json({
          success: false,
          error: 'Not authorized to create recurring transactions for this user'
        });
      }
    }

    // For allowance type, validate distribution and check for existing allowance
    if (type === 'allowance') {
      if (!distribution) {
        return res.status(400).json({
          success: false,
          error: 'Please provide distribution for allowance'
        });
      }

      const total = (distribution.spending || 0) +
                    (distribution.saving || 0) +
                    (distribution.donation || 0);

      if (total !== 100) {
        return res.status(400).json({
          success: false,
          error: 'Distribution percentages must add up to 100%'
        });
      }

      // Check if user already has an allowance
      const existingAllowance = await RecurringTransaction.findOne({
        user: targetUser,
        type: 'allowance',
        active: true
      });

      if (existingAllowance) {
        return res.status(400).json({
          success: false,
          error: 'User already has an active allowance. Only one allowance per user is permitted.'
        });
      }
    }

    // Create the recurring transaction
    const recurringTransaction = await RecurringTransaction.create({
      name,
      description: description || name,
      amount,
      type,
      frequency,
      account,
      user: targetUser,
      createdBy: req.user.id,
      distribution: type === 'allowance' ? distribution : undefined,
      nextDate: new Date(nextDate),
      active: active !== undefined ? active : true
    });

    res.status(201).json({
      success: true,
      data: recurringTransaction
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Update recurring transaction
// @route   PUT /api/recurring/:id
// @access  Private
exports.updateRecurringTransaction = async (req, res, next) => {
  try {
    let recurringTransaction = await RecurringTransaction.findById(req.params.id);

    if (!recurringTransaction) {
      return res.status(404).json({
        success: false,
        error: 'Recurring transaction not found'
      });
    }

    // Check ownership or parent relationship
    if (req.user.role === 'child' && recurringTransaction.user.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        error: 'Not authorized to update this recurring transaction'
      });
    }

    if (req.user.role === 'parent' && recurringTransaction.user.toString() !== req.user.id) {
      // Check if this recurring transaction belongs to one of their children
      const child = await User.findById(recurringTransaction.user);
      if (!child || child.parent.toString() !== req.user.id) {
        return res.status(403).json({
          success: false,
          error: 'Not authorized to update this recurring transaction'
        });
      }
    }

    // For allowance type, validate distribution if updated
    if (recurringTransaction.type === 'allowance' && req.body.distribution) {
      const total = (req.body.distribution.spending || 0) +
                    (req.body.distribution.saving || 0) +
                    (req.body.distribution.donation || 0);

      if (total !== 100) {
        return res.status(400).json({
          success: false,
          error: 'Distribution percentages must add up to 100%'
        });
      }
    }

    // Update the recurring transaction
    recurringTransaction = await RecurringTransaction.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    });

    res.status(200).json({
      success: true,
      data: recurringTransaction
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Delete recurring transaction
// @route   DELETE /api/recurring/:id
// @access  Private
exports.deleteRecurringTransaction = async (req, res, next) => {
  try {
    const recurringTransaction = await RecurringTransaction.findById(req.params.id);

    if (!recurringTransaction) {
      return res.status(404).json({
        success: false,
        error: 'Recurring transaction not found'
      });
    }

    // Check ownership or parent relationship
    if (req.user.role === 'child' && recurringTransaction.user.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        error: 'Not authorized to delete this recurring transaction'
      });
    }

    if (req.user.role === 'parent' && recurringTransaction.user.toString() !== req.user.id) {
      // Check if this recurring transaction belongs to one of their children
      const child = await User.findById(recurringTransaction.user);
      if (!child || child.parent.toString() !== req.user.id) {
        return res.status(403).json({
          success: false,
          error: 'Not authorized to delete this recurring transaction'
        });
      }
    }

    await recurringTransaction.deleteOne();

    res.status(200).json({
      success: true,
      data: {}
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Process recurring transactions
// @route   POST /api/recurring/process
// @access  Private/Admin
exports.processRecurringTransactions = async (req, res, next) => {
  try {
    // First, update/create interest recurring transactions for all eligible accounts
    const interestService = require('../services/interestService');
    await interestService.createInterestRecurringTransactions();
    await interestService.updateInterestAmounts();
    
    // Get all active recurring transactions due for processing
    const now = new Date();
    const recurringTransactions = await RecurringTransaction.find({
      active: true,
      nextDate: { $lte: now }
    }).populate('account').populate('user');

    const results = [];
    const errors = [];

    // Process each recurring transaction
    for (const item of recurringTransactions) {
      try {
        if (item.type === 'allowance') {
          // Handle allowance type - distribute to multiple accounts
          await processAllowanceTransaction(item);
        } else {
          // Handle other transaction types
          await processRegularTransaction(item);
        }

        // Update next processing date
        const nextDate = calculateNextDate(item.nextDate, item.frequency);
        
        await RecurringTransaction.findByIdAndUpdate(item._id, {
          lastProcessed: now,
          nextDate: nextDate
        });

        results.push({
          id: item._id,
          name: item.name,
          type: item.type,
          amount: item.amount,
          nextDate: nextDate
        });
      } catch (error) {
        console.error(`Error processing recurring transaction ${item._id}:`, error);
        errors.push({
          id: item._id,
          name: item.name,
          error: error.message
        });
      }
    }

    res.status(200).json({
      success: true,
      processed: results.length,
      errors: errors.length,
      data: { processed: results, errors }
    });
  } catch (err) {
    next(err);
  }
};

// Helper function to process allowance transactions
async function processAllowanceTransaction(item) {
  const { user, amount, distribution } = item;
  
  // Get user's accounts
  const accounts = await Account.find({ owner: user._id });
  
  // Process for each account type
  for (const accountType of ['spending', 'saving', 'donation']) {
    // Find account of this type
    const account = accounts.find(acc => acc.type === accountType);
    
    if (!account) continue; // Skip if account type doesn't exist
    
    // Get percentage for this account type
    const percentValue = distribution[accountType] || 0;
    
    if (percentValue <= 0) continue; // Skip if no amount allocated
    
    // Calculate amount for this account
    const accountAmount = (amount * percentValue / 100);
    
    // Create transaction
    const transaction = await Transaction.create({
      description: item.description || 'Recurring Allowance',
      amount: accountAmount,
      type: 'deposit',
      account: account._id,
      date: new Date(),
      approved: true
    });
    
    // Update account balance
    await Account.findByIdAndUpdate(account._id, {
      balance: account.balance + accountAmount
    });
  }
}

// Helper function to process regular transactions
async function processRegularTransaction(item) {
  const { account, amount, type } = item;
  
  // Create transaction
  const transaction = await Transaction.create({
    description: item.description || `Recurring ${capitalizeFirstLetter(type)}`,
    amount,
    type: type === 'subscription' ? 'withdrawal' : (type === 'interest' ? 'interest' : 'deposit'),
    account: account._id,
    date: new Date(),
    approved: true
  });
  
  // Update account balance
  const balanceChange = type === 'subscription' ? -amount : amount;
  await Account.findByIdAndUpdate(account._id, {
    balance: account.balance + balanceChange
  });
}

// Helper function to calculate next processing date
function calculateNextDate(currentDate, frequency) {
  const date = new Date(currentDate);
  
  switch (frequency) {
    case 'daily':
      date.setDate(date.getDate() + 1);
      break;
    case 'weekly':
      date.setDate(date.getDate() + 7);
      break;
    case 'monthly':
      date.setMonth(date.getMonth() + 1);
      break;
    case 'yearly':
      date.setFullYear(date.getFullYear() + 1);
      break;
    default:
      // Default to weekly
      date.setDate(date.getDate() + 7);
  }
  
  return date;
}

// @desc    Initialize/Update interest recurring transactions
// @route   POST /api/recurring/initialize-interest
// @access  Private/Parent
exports.initializeInterestTransactions = async (req, res, next) => {
  try {
    const interestService = require('../services/interestService');
    const result = await interestService.createInterestRecurringTransactions();
    
    res.status(200).json({
      success: true,
      message: 'Interest recurring transactions initialized successfully',
      data: result
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get interest recurring transactions
// @route   GET /api/recurring/interest
// @access  Private
exports.getInterestTransactions = async (req, res, next) => {
  try {
    const interestService = require('../services/interestService');
    const transactions = await interestService.getInterestTransactions(req.user.id, req.user.role);
    
    res.status(200).json({
      success: true,
      count: transactions.length,
      data: transactions
    });
  } catch (err) {
    next(err);
  }
};

// Helper function
function capitalizeFirstLetter(string) {
  return string.charAt(0).toUpperCase() + string.slice(1);
}