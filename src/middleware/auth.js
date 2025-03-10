// Middleware to check if user is authenticated
exports.ensureAuth = function(req, res, next) {
    if (req.isAuthenticated()) {
      return next();
    }
    res.status(401).json({ success: false, error: 'Not authorized' });
  };
  
  // Middleware to check if user is admin
  exports.ensureAdmin = function(req, res, next) {
    if (req.isAuthenticated() && req.user.role === 'parent') {
      return next();
    }
    res.status(403).json({ success: false, error: 'Admin access required' });
  };
  
  // Middleware to check if user is the owner or admin
  exports.ensureOwnerOrAdmin = function(req, res, next) {
    if (req.isAuthenticated()) {
      if (req.user.role === 'parent' || req.user._id.toString() === req.params.id) {
        return next();
      }
    }
    res.status(403).json({ success: false, error: 'Not authorized' });
  };