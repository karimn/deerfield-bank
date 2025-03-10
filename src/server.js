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

// Load env vars
dotenv.config();

// Connect to database
connectDB();

// Initialize app
const app = express();

// Middleware
app.use(express.json());
app.use(cors());
app.use(helmet());

// Logging middleware
if (process.env.NODE_ENV === 'development') {
  app.use(helmet({
    contentSecurityPolicy: false
  }));
  app.use(morgan('dev'));
}

app.use(express.static(path.join(__dirname, 'public')));

// Define routes
app.get('/api', (req, res) => {
  res.json({ message: 'Welcome to the Deerfield Bank API' });
});

// Initialize routes (will add these soon)
// Routes
app.use('/api/users', require('./routes/users'));
app.use('/api/accounts', require('./routes/accounts'));
// In server.js, where you define your routes
app.use('/api/transactions', require('./routes/transactions'));
app.use('/api/subscriptions', require('./routes/subscriptions'));

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
