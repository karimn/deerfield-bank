const express = require('express');
const {
  getSubscriptions,
  getSubscription,
  createSubscription,
  updateSubscription,
  deleteSubscription,
  processSubscriptions
} = require('../controllers/subscriptions');

const router = express.Router();

router.route('/')
  .get(getSubscriptions)
  .post(createSubscription);

router.route('/process')
  .post(processSubscriptions);

router.route('/:id')
  .get(getSubscription)
  .put(updateSubscription)
  .delete(deleteSubscription);

module.exports = router;