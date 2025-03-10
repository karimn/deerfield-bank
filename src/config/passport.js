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
      // Check if user already exists
      let user = await User.findOne({ googleId: profile.id });
      
      if (user) {
        // User exists, return the user
        return done(null, user);
      }
      
      // If we don't have a user with this Google ID
      // We need to determine if this is a new signup or an existing email
      user = await User.findOne({ email: profile.emails[0].value });
      
      if (user) {
        // Email exists but not linked to Google, update the user
        user.googleId = profile.id;
        await user.save();
        return done(null, user);
      }
      
      // Create a new user (will need admin approval to set role)
      const newUser = await User.create({
        name: profile.displayName,
        email: profile.emails[0].value,
        googleId: profile.id,
        role: 'child'  // Default to child, admin can change later
      });
      
      return done(null, newUser);
    } catch (err) {
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