const express = require('express');
const {
  getTransactions,
  getTransaction,
  createTransaction,
  updateTransaction,
  deleteTransaction,
  markTransactionDeleted
} = require('../controllers/transactions');

const router = express.Router();

router.route('/')
  .get(getTransactions)
  .post(createTransaction);

router.route('/:id')
  .get(getTransaction)
  .put(updateTransaction)
  .delete(deleteTransaction);

router.route('/:id/delete')
  .delete(markTransactionDeleted);

module.exports = router;