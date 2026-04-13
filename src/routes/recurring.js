const express = require('express');
const {
  getRecurringTransactions,
  getRecurringTransaction,
  createRecurringTransaction,
  updateRecurringTransaction,
  deleteRecurringTransaction,
  processRecurringTransactions,
  initializeInterestTransactions,
  getInterestTransactions
} = require('../controllers/recurringTransactions');

const router = express.Router();

router.route('/')
  .get(getRecurringTransactions)
  .post(createRecurringTransaction);

// Literal routes must be defined before /:id so Express matches them first
router.route('/process')
  .post(processRecurringTransactions);

router.route('/initialize-interest')
  .post(initializeInterestTransactions);

router.route('/interest')
  .get(getInterestTransactions);

router.route('/:id')
  .get(getRecurringTransaction)
  .put(updateRecurringTransaction)
  .delete(deleteRecurringTransaction);

module.exports = router;