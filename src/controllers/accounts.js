const Account = require('../models/Account');
const User = require('../models/User');

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
