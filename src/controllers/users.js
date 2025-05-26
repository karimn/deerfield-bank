const User = require('../models/User');
const { canAccessChild } = require('../utils/parentAuth');

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
    const existingUser = await User.findOne({ email: req.body.email });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        error: 'User with this email already exists'
      });
    }
    
    const userData = {
      name: req.body.name,
      email: req.body.email,
      role: req.body.role || 'child',
      firstName: req.body.firstName,
      lastName: req.body.lastName,
      dateOfBirth: req.body.dateOfBirth,
      googleId: req.body.googleId,
      phone: req.body.phone
    };

    // Handle multiple parents
    if (req.body.parents && Array.isArray(req.body.parents)) {
      userData.parents = req.body.parents;
    } else if (req.body.parent) {
      // Support legacy single parent format
      userData.parents = [req.body.parent];
      userData.parent = req.body.parent; // Keep for backward compatibility
    }
    
    // Remove undefined fields
    Object.keys(userData).forEach(key => userData[key] === undefined && delete userData[key]);
    
    const user = await User.create(userData);
    
    res.status(201).json({
      success: true,
      data: user
    });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(400).json({
        success: false,
        error: 'User with this email already exists'
      });
    }
    next(err);
  }
};

// @desc    Update user
// @route   PUT /api/users/:id
// @access  Private/Admin or Self
exports.updateUser = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }
    
    const updateData = { ...req.body };
    
    // Handle date parsing for dateOfBirth
    if (updateData.dateOfBirth) {
      const dateStr = updateData.dateOfBirth;
      let parsedDate;
      
      if (typeof dateStr === 'string' && dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
        // YYYY-MM-DD format
        const [year, month, day] = dateStr.split('-').map(num => parseInt(num, 10));
        parsedDate = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
      } else {
        parsedDate = new Date(dateStr);
      }
      
      if (isNaN(parsedDate.getTime())) {
        return res.status(400).json({
          success: false,
          error: 'Invalid date format'
        });
      }
      
      updateData.dateOfBirth = parsedDate;
    }
    
    // Auto-generate name from firstName and lastName if both provided
    if (updateData.firstName && updateData.lastName) {
      updateData.name = `${updateData.firstName} ${updateData.lastName}`;
    } else if (updateData.firstName || updateData.lastName) {
      const firstName = updateData.firstName || user.firstName || '';
      const lastName = updateData.lastName || user.lastName || '';
      updateData.name = `${firstName} ${lastName}`.trim();
    }
    
    const updatedUser = await User.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    );
    
    res.status(200).json({
      success: true,
      data: updatedUser
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
    const user = await User.findByIdAndDelete(req.params.id);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    res.status(200).json({
      success: true,
      data: {}
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get children of current parent
// @route   GET /api/users/children
// @access  Private/Parent
exports.getChildren = async (req, res, next) => {
  try {
    if (req.user.role !== 'parent') {
      return res.status(403).json({
        success: false,
        error: 'Only parents can access this endpoint'
      });
    }

    const children = await User.findChildrenOfParent(req.user.id)
      .populate('accounts')
      .select('-googleId -auth0Id');

    res.status(200).json({
      success: true,
      count: children.length,
      data: children
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Add parent to child
// @route   POST /api/users/:childId/parents
// @access  Private/Parent (must already be a parent of the child)
exports.addParentToChild = async (req, res, next) => {
  try {
    const { childId } = req.params;
    const { parentId } = req.body;

    // Check if current user can manage this child
    if (req.user.role !== 'parent' || !(await canAccessChild(req.user.id, childId))) {
      return res.status(403).json({
        success: false,
        error: 'Not authorized to manage this child'
      });
    }

    const child = await User.findById(childId);
    const newParent = await User.findById(parentId);

    if (!child || child.role !== 'child') {
      return res.status(404).json({
        success: false,
        error: 'Child not found'
      });
    }

    if (!newParent || newParent.role !== 'parent') {
      return res.status(404).json({
        success: false,
        error: 'Parent not found'
      });
    }

    await child.addParent(parentId);

    res.status(200).json({
      success: true,
      message: 'Parent added successfully',
      data: child
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Remove parent from child
// @route   DELETE /api/users/:childId/parents/:parentId
// @access  Private/Parent (must already be a parent of the child)
exports.removeParentFromChild = async (req, res, next) => {
  try {
    const { childId, parentId } = req.params;

    // Check if current user can manage this child
    if (req.user.role !== 'parent' || !(await canAccessChild(req.user.id, childId))) {
      return res.status(403).json({
        success: false,
        error: 'Not authorized to manage this child'
      });
    }

    const child = await User.findById(childId);
    if (!child || child.role !== 'child') {
      return res.status(404).json({
        success: false,
        error: 'Child not found'
      });
    }

    // Prevent removing the last parent
    const allParents = child.getAllParents();
    if (allParents.length <= 1) {
      return res.status(400).json({
        success: false,
        error: 'Cannot remove the last parent from a child'
      });
    }

    await child.removeParent(parentId);

    res.status(200).json({
      success: true,
      message: 'Parent removed successfully',
      data: child
    });
  } catch (err) {
    next(err);
  }
};
