const User = require('../models/User');

/**
 * Check if a user can access a child's data
 * @param {string} userId - The user's ID
 * @param {string} childId - The child's ID
 * @returns {Promise<boolean>} - True if user can access child data
 */
const canAccessChild = async (userId, childId) => {
  try {
    const child = await User.findById(childId);
    if (!child || child.role !== 'child') {
      return false;
    }
    
    // Check if user is in the child's parents array or is the legacy parent
    return child.getAllParents().some(parentId => parentId.equals(userId));
  } catch (error) {
    console.error('Error checking child access:', error);
    return false;
  }
};

/**
 * Get all children that a parent can access
 * @param {string} parentId - The parent's ID
 * @returns {Promise<Array>} - Array of child user objects
 */
const getAccessibleChildren = async (parentId) => {
  try {
    return await User.findChildrenOfParent(parentId);
  } catch (error) {
    console.error('Error getting accessible children:', error);
    return [];
  }
};

/**
 * Middleware to ensure user can access a child (for route protection)
 */
const ensureCanAccessChild = async (req, res, next) => {
  try {
    const childId = req.params.childId || req.params.id;
    
    if (!childId) {
      return res.status(400).json({
        success: false,
        error: 'Child ID is required'
      });
    }

    // Admin can access anyone
    if (req.user.role === 'admin') {
      return next();
    }

    // Child can only access their own data
    if (req.user.role === 'child') {
      if (req.user.id === childId) {
        return next();
      }
      return res.status(403).json({
        success: false,
        error: 'Not authorized to access this child\'s data'
      });
    }

    // Parent must be authorized for this child
    if (req.user.role === 'parent') {
      const hasAccess = await canAccessChild(req.user.id, childId);
      if (hasAccess) {
        return next();
      }
      return res.status(403).json({
        success: false,
        error: 'Not authorized to access this child\'s data'
      });
    }

    return res.status(403).json({
      success: false,
      error: 'Not authorized'
    });
  } catch (error) {
    console.error('Authorization error:', error);
    return res.status(500).json({
      success: false,
      error: 'Authorization check failed'
    });
  }
};

/**
 * Filter query results to only include data the user can access
 * @param {Object} user - The authenticated user
 * @param {Object} query - The mongoose query object
 * @param {string} ownerField - The field name that contains the owner/child ID
 * @returns {Promise<Object>} - Modified query
 */
const filterByParentAccess = async (user, query, ownerField = 'owner') => {
  if (user.role === 'admin') {
    // Admin can see everything
    return query;
  }
  
  if (user.role === 'child') {
    // Child can only see their own data
    return query.where(ownerField).equals(user.id);
  }
  
  if (user.role === 'parent') {
    // Parent can see their children's data
    const children = await getAccessibleChildren(user.id);
    const childIds = children.map(child => child._id);
    childIds.push(user.id); // Include parent's own data
    
    return query.where(ownerField).in(childIds);
  }
  
  // Default: no access
  return query.where(ownerField).equals(null);
};

module.exports = {
  canAccessChild,
  getAccessibleChildren,
  ensureCanAccessChild,
  filterByParentAccess
};