const passport = require('passport');
const Auth0Strategy = require('passport-auth0');
const User = require('../models/User');

module.exports = function() {
  passport.use(new Auth0Strategy({
    domain: process.env.AUTH0_DOMAIN,
    clientID: process.env.AUTH0_CLIENT_ID,
    clientSecret: process.env.AUTH0_CLIENT_SECRET,
    callbackURL: process.env.AUTH0_CALLBACK_URL || '/auth/auth0/callback'
  }, 
  async (_accessToken, _refreshToken, _extraParams, profile, done) => {
    try {
      // Check if user already exists with Auth0 ID
      let user = await User.findOne({ auth0Id: profile.id });
      
      if (user) {
        // User exists with this Auth0 ID, return the user
        return done(null, user);
      }
      
      // Ensure emails array exists and has at least one email
      if (!profile.emails || !profile.emails[0] || !profile.emails[0].value) {
        return done(null, false, { message: 'No email address found in Auth0 profile. Please try again.' });
      }
      
      // If no user with this Auth0 ID, check if a user exists with the email
      const profileEmail = profile.emails[0].value;
      user = await User.findOne({ email: profileEmail });
      
      if (user) {
        // Email exists but not linked to Auth0, update the user
        user.auth0Id = profile.id;
        await user.save({ w: 'majority' });
        return done(null, user);
      }
      
      // Try case-insensitive search
      const userCaseInsensitive = await User.findOne({ 
        email: { $regex: new RegExp(`^${profileEmail}$`, 'i') } 
      });
      
      if (userCaseInsensitive) {
        // Email exists with different case but not linked to Auth0, update the user
        userCaseInsensitive.auth0Id = profile.id;
        await userCaseInsensitive.save({ w: 'majority' });
        return done(null, userCaseInsensitive);
      }
      
      // No user found with this Auth0 ID or email
      return done(null, false, { message: 'No account exists for this email. Please contact an administrator to create an account.' });
      
    } catch (err) {
      console.error('Error in Auth0 strategy:', err);
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