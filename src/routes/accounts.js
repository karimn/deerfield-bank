const express = require('express');
const {
  getAccounts,
  getAccount,
  createAccount,
  updateAccount,
  deleteAccount,
  recalculateBalance
} = require('../controllers/accounts');

const router = express.Router();

router.route('/')
  .get(getAccounts)
  .post(createAccount);

router.route('/:id')
  .get(getAccount)
  .put(updateAccount)
  .delete(deleteAccount);

router.route('/:id/recalculate')
  .post(recalculateBalance);

module.exports = router;
