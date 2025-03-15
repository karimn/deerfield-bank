// src/routes/allowance.js

const express = require('express');
const {
  processAllowance,
  calculateInterest
} = require('../controllers/allowance');

const router = express.Router();

// Allowance routes
router.route('/allowance/process')
  .post(processAllowance);

// Interest routes
router.route('/interest/calculate')
  .post(calculateInterest);

module.exports = router;