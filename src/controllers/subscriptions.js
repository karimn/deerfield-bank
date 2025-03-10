const Subscription = require('../models/Subscription');
const Transaction = require('../models/Transaction');
const Account = require('../models/Account');

// @desc    Get all subscriptions
// @route   GET /api/subscriptions
// @access  Private
exports.getSubscriptions = async (req, res, next) => {
  try {
    let query;
    
    // Filter by account if provided
    if (req.query.accountId) {
      query = Subscription.find({ account: req.query.accountId });
    } else {
      query = Subscription.find();
    }
    
    // Add sort, populate
    query = query.sort('nextDate').populate('account');
    
    const subscriptions = await query;
    
    res.status(200).json({
      success: true,
      count: subscriptions.length,
      data: subscriptions
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get single subscription
// @route   GET /api/subscriptions/:id
// @access  Private
exports.getSubscription = async (req, res, next) => {
  try {
    const subscription = await Subscription.findById(req.params.id)
      .populate('account');
    
    if (!subscription) {
      return res.status(404).json({
        success: false,
        error: 'Subscription not found'
      });
    }

    res.status(200).json({
      success: true,
      data: subscription
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Create subscription
// @route   POST /api/subscriptions
// @access  Private
exports.createSubscription = async (req, res, next) => {
  try {
    // Check if account exists
    const account = await Account.findById(req.body.account);
    if (!account) {
      return res.status(404).json({
        success: false,
        error: 'Account not found'
      });
    }
    
    // Create subscription
    const subscription = await Subscription.create(req.body);
    
    res.status(201).json({
      success: true,
      data: subscription
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Update subscription
// @route   PUT /api/subscriptions/:id
// @access  Private
exports.updateSubscription = async (req, res, next) => {
  try {
    const subscription = await Subscription.findByIdAndUpdate(
      req.params.id, 
      req.body, 
      {
        new: true,
        runValidators: true
      }
    );
    
    if (!subscription) {
      return res.status(404).json({
        success: false,
        error: 'Subscription not found'
      });
    }

    res.status(200).json({
      success: true,
      data: subscription
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Delete subscription
// @route   DELETE /api/subscriptions/:id
// @access  Private
exports.deleteSubscription = async (req, res, next) => {
  try {
    const subscription = await Subscription.findById(req.params.id);
    
    if (!subscription) {
      return res.status(404).json({
        success: false,
        error: 'Subscription not found'
      });
    }
    
    await subscription.deleteOne();

    res.status(200).json({
      success: true,
      data: {}
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Process due subscriptions
// @route   POST /api/subscriptions/process
// @access  Private/Admin
exports.processSubscriptions = async (req, res, next) => {
  try {
    // Find all active subscriptions due today or earlier
    const now = new Date();
    const dueSubscriptions = await Subscription.find({
      active: true,
      nextDate: { $lte: now }
    });
    
    const results = [];
    
    // Process each subscription
    for (const subscription of dueSubscriptions) {
      // Create a transaction for this subscription
      const transaction = await Transaction.create({
        description: `${subscription.name} - Automatic payment`,
        amount: subscription.amount,
        type: 'subscription',
        date: now,
        account: subscription.account,
        approved: true,
        subscription: subscription._id
      });
      
      results.push(transaction);
      
      // Update account balance
      const account = await Account.findById(subscription.account);
      await Account.findByIdAndUpdate(account._id, {
        balance: account.balance - subscription.amount
      });
      
      // Calculate next date based on frequency
      let nextDate = new Date(subscription.nextDate);
      
      if (subscription.frequency === 'weekly') {
        nextDate.setDate(nextDate.getDate() + 7);
      } else if (subscription.frequency === 'monthly') {
        nextDate.setMonth(nextDate.getMonth() + 1);
      } else if (subscription.frequency === 'yearly') {
        nextDate.setFullYear(nextDate.getFullYear() + 1);
      }
      
      // Update subscription with new next date
      await Subscription.findByIdAndUpdate(subscription._id, {
        nextDate
      });
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