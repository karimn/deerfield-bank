const express = require('express');
const passport = require('passport');
const router = express.Router();

// @route   GET /auth/auth0
// @desc    Authenticate with Auth0
// @access  Public
router.get('/auth0', 
  passport.authenticate('auth0', { 
    scope: 'openid email profile',
    prompt: 'login'
  })
);

// @route   GET /auth/auth0/callback
// @desc    Auth0 auth callback
// @access  Public
router.get('/auth0/callback', (req, res, next) => {
  passport.authenticate('auth0', (err, user) => {
    if (err) {
      return next(err);
    }
    
    if (!user) {
      // Authentication failed - redirect without session blocking
      return res.redirect('/auth-failed.html?error=auth_failed');
    }
    
    // Log in the user
    req.logIn(user, (err) => {
      if (err) {
        return next(err);
      }
      
      // User successfully logged in
      
      // Successful authentication - redirect based on user role
      if (user.role === 'parent') {
        res.redirect('/parent-dashboard.html');
      } else {
        res.redirect('/dashboard.html');
      }
    });
  })(req, res, next);
});

// @route   GET /auth/logout
// @desc    Logout user
// @access  Private
router.get('/logout', (req, res, next) => {
  req.logout(function(err) {
    if (err) { return next(err); }
    
    // Clear Auth0 session by redirecting to Auth0 logout URL
    const logoutURL = new URL(`https://${process.env.AUTH0_DOMAIN}/v2/logout`);
    logoutURL.searchParams.set('client_id', process.env.AUTH0_CLIENT_ID);
    logoutURL.searchParams.set('returnTo', `${req.protocol}://${req.get('host')}/login.html`);
    
    res.redirect(logoutURL.toString());
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