const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const User = require('../models/User');

module.exports = function() {
  passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: '/auth/google/callback'
  }, 
  async (accessToken, refreshToken, profile, done) => {
    try {
      console.log('Google auth callback triggered');
      console.log('Profile:', profile.displayName, profile.emails[0].value);
      
      // Check if user already exists with Google ID
      let user = await User.findOne({ googleId: profile.id });
      
      if (user) {
        // User exists with this Google ID, return the user
        console.log('Existing user found with Google ID:', user.name);
        return done(null, user);
      }
      
      // If no user with this Google ID, check if a user exists with the email
      user = await User.findOne({ email: profile.emails[0].value });
      
      if (user) {
        // Email exists but not linked to Google, update the user
        console.log('Updating existing user with Google ID');
        user.googleId = profile.id;
        await user.save();
        return done(null, user);
      }
      
      // No user found with this Google ID or email
      // Instead of creating a new user, we'll return an error
      console.log('No existing account found for this Google user');
      return done(null, false, { message: 'No account exists for this email. Please contact an administrator to create an account.' });
      
    } catch (err) {
      console.error('Error in Google strategy:', err);
      return done(err, null);
    }
  }));
  
  passport.serializeUser((user, done) => {
    done(null, user.id);
  });
  
  passport.deserializeUser(async (id, done) => {
    try {
      const user = await User.findById(id);
      done(null, user);
    } catch (err) {
      done(err, null);
    }
  });
};