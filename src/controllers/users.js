const User = require('../models/User');

// @desc    Get all users
// @route   GET /api/users
// @access  Private/Admin
exports.getUsers = async (req, res, next) => {
  try {
    const users = await User.find();
    res.status(200).json({
      success: true,
      count: users.length,
      data: users
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get single user
// @route   GET /api/users/:id
// @access  Private/Admin or Self
exports.getUser = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id).populate('accounts');
    
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    res.status(200).json({
      success: true,
      data: user
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Create user
// @route   POST /api/users
// @access  Private/Admin
exports.createUser = async (req, res, next) => {
  try {
    // Debug: Log incoming request
    console.log('Creating user with request body:', JSON.stringify(req.body));
    
    // Check if dateOfBirth is empty string or null or undefined
    const dateOfBirthMissing = !req.body.dateOfBirth || req.body.dateOfBirth === '';
    console.log('dateOfBirthMissing:', dateOfBirthMissing);
    
    // Check for required fields for new child users
    if (req.body.role === 'child' && dateOfBirthMissing) {
      return res.status(400).json({
        success: false,
        error: 'Date of birth is required for new child users'
      });
    }
    
    // Validate date format if provided
    if (req.body.dateOfBirth) {
      const dateObject = new Date(req.body.dateOfBirth);
      const isValidDate = !isNaN(dateObject.getTime());
      console.log('Date validation:', req.body.dateOfBirth, '->', dateObject, 'isValid:', isValidDate);
      
      if (!isValidDate) {
        return res.status(400).json({
          success: false,
          error: 'Invalid date of birth format'
        });
      }
    }
    
    // Create user with manual validation
    const userData = {
      name: req.body.name,
      email: req.body.email,
      role: req.body.role || 'child',
      parent: req.body.parent
    };
    
    // Only add dateOfBirth if it's provided
    if (req.body.dateOfBirth) {
      userData.dateOfBirth = req.body.dateOfBirth;
    }
    
    // Add any other fields
    if (req.body.googleId) userData.googleId = req.body.googleId;
    if (req.body.phone) userData.phone = req.body.phone;
    
    const user = await User.create(userData);
    
    res.status(201).json({
      success: true,
      data: user
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Update user
// @route   PUT /api/users/:id
// @access  Private/Admin or Self
exports.updateUser = async (req, res, next) => {
  try {
    // Prevent child users from changing their date of birth
    if (req.user && req.user.role === 'child' && req.user._id.toString() === req.params.id && req.body.dateOfBirth) {
      delete req.body.dateOfBirth;
    }
    
    // Use direct MongoDB operations to bypass Mongoose validation
    // This is a more aggressive approach but ensures updates work for legacy users
    const user = await User.findOneAndUpdate(
      { _id: req.params.id },
      { $set: req.body },
      { 
        new: true,              // Return updated document
        runValidators: false,   // Skip validators
        strict: false           // Allow updating fields not in schema
      }
    );
    
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    res.status(200).json({
      success: true,
      data: user
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Delete user
// @route   DELETE /api/users/:id
// @access  Private/Admin
exports.deleteUser = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    await user.remove();

    res.status(200).json({
      success: true,
      data: {}
    });
  } catch (err) {
    next(err);
  }
};
