const express = require('express');
const dotenv = require('dotenv');
const morgan = require('morgan');
const cors = require('cors');
const helmet = require('helmet');
const connectDB = require('./config/db');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const passport = require('passport');
//const path = require('path');

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
app.use(helmet());
app.use(express.static('public'));

// Logging middleware
if (process.env.NODE_ENV === 'development') {
  // app.use(helmet({
  //   contentSecurityPolicy: false
  // }));
  app.use(morgan('dev'));
}

//app.use(express.static(path.join(__dirname, 'public')));

app.use(session({
  secret: process.env.SESSION_SECRET || 'keyboard cat',
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({ 
    mongoUrl: process.env.MONGO_URI 
  }),
  cookie: {
    maxAge: 1000 * 60 * 60 * 24 // 1 day
  }
}));

// Passport middleware
app.use(passport.initialize());
app.use(passport.session());

// Define routes
app.get('/', (req, res) => {
  res.sendFile('index.html');
});

app.use('/auth', require('./routes/auth'));

// Initialize routes (will add these soon)
// Routes
app.use('/api/users', require('./routes/users'));
app.use('/api/accounts', require('./routes/accounts'));
// In server.js, where you define your routes
app.use('/api/transactions', require('./routes/transactions'));
app.use('/api/subscriptions', require('./routes/subscriptions'));
app.use('/api', require('./routes/allowance'));

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
