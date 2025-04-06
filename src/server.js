const express = require('express');
const dotenv = require('dotenv');
const morgan = require('morgan');
const cors = require('cors');
const helmet = require('helmet');
const connectDB = require('./config/db');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const passport = require('passport');
const path = require('path');
const fs = require('fs');
const { ensureAuth } = require('./middleware/auth');

// Load env vars
dotenv.config();

// Connect to database
connectDB();

// Passport config
require('./config/passport')();

// Initialize app
const app = express();

// Middleware
app.use(express.json());
app.use(cors());
app.use(helmet({
  contentSecurityPolicy: false
}));

// Logging middleware
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// Session middleware
app.use(session({
  secret: process.env.SESSION_SECRET || 'keyboard cat',
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({ 
    mongoUrl: process.env.NODE_ENV === 'production' ? process.env.MONGO_URI_PROD : process.env.MONGO_URI_DEV 
  }),
  cookie: {
    maxAge: 1000 * 60 * 60 * 24 // 1 day
  }
}));

// Passport middleware
app.use(passport.initialize());
app.use(passport.session());

app.use(express.static(path.join(__dirname, 'public')));

// Auth routes
app.use('/auth', require('./routes/auth'));

// API routes - protect all API routes with ensureAuth
app.use('/api/users', ensureAuth, require('./routes/users'));
app.use('/api/accounts', ensureAuth, require('./routes/accounts'));
app.use('/api/transactions', ensureAuth, require('./routes/transactions'));
app.use('/api/subscriptions', ensureAuth, require('./routes/subscriptions'));
app.use('/api/recurring', ensureAuth, require('./routes/recurring'));
app.use('/api', ensureAuth, require('./routes/allowance'));

// Redirect root to login or dashboard based on auth status
// Redirect root to login or dashboard based on auth status and role
app.get('/', (req, res) => {
  if (req.isAuthenticated()) {
    if (req.user.role === 'parent') {
      res.redirect('/parent-dashboard.html');
    } else {
      res.redirect('/dashboard.html');
    }
  } else {
    res.redirect('/login.html');
  }
});

// Catch-all route handler for HTML pages
app.get('*.html', (req, res, next) => {
  // Skip login page - always accessible
  if (req.path === '/login.html') {
    return next();
  }
  
  // Check authentication for other HTML pages
  if (!req.isAuthenticated()) {
    return res.redirect('/login.html');
  }
  
  // Continue to serve the file if authenticated
  next();
});

// Handle 404 for non-existent files or routes
app.use((req, res) => {
  res.status(404).send('Not found');
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    success: false,
    error: err.message || 'Server Error'
  });
});

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
});