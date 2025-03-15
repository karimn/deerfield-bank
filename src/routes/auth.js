const express = require('express');
const passport = require('passport');
const router = express.Router();

// @route   GET /auth/google
// @desc    Authenticate with Google
// @access  Public
router.get('/google', 
  passport.authenticate('google', { scope: ['profile', 'email'] })
);

// @route   GET /auth/google/callback
// @desc    Google auth callback
// @access  Public
router.get('/google/callback', 
  passport.authenticate('google', { 
    failureRedirect: '/auth-failed.html',
    failureMessage: true 
  }),
  (req, res) => {
    // Successful authentication - redirect based on user role
    if (req.user.role === 'parent') {
      res.redirect('/parent-dashboard.html');
    } else {
      res.redirect('/dashboard.html');
    }
  }
);

// @route   GET /auth/logout
// @desc    Logout user
// @access  Private
router.get('/logout', (req, res, next) => {
  req.logout(function(err) {
    if (err) { return next(err); }
    res.redirect('/login.html');
  });
});

// @route   GET /auth/check
// @desc    Check if user is authenticated
// @access  Public
router.get('/check', (req, res) => {
  if (req.isAuthenticated()) {
    return res.json({ 
      isAuthenticated: true, 
      user: {
        id: req.user._id,
        name: req.user.name,
        email: req.user.email,
        role: req.user.role
      }
    });
  }
  res.json({ isAuthenticated: false });
});

module.exports = router;