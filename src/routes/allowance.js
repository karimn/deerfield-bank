const express = require('express');
const {
  processAllowance
} = require('../controllers/allowance');
const {
  calculateInterest
} = require('../controllers/interest');

const router = express.Router();

// Allowance routes
router.route('/allowance/process')
  .post(processAllowance);

// Interest routes
router.route('/interest/calculate')
  .post(calculateInterest);

module.exports = router;