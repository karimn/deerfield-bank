const express = require('express');
const {
  getUsers,
  getUser,
  createUser,
  updateUser,
  deleteUser,
  getChildren,
  addParentToChild,
  removeParentFromChild
} = require('../controllers/users');
const { ensureAuth, ensureAdmin, ensureOwnerOrAdmin } = require('../middleware/auth');

const router = express.Router();

router.route('/')
  .get(ensureAdmin, getUsers)
  .post(ensureAdmin, createUser);

router.route('/:id')
  .get(ensureOwnerOrAdmin, getUser)
  .put(ensureOwnerOrAdmin, updateUser)
  .delete(ensureAdmin, deleteUser);

// Multiple parent management routes
router.route('/children')
  .get(getChildren);

router.route('/:childId/parents')
  .post(addParentToChild);

router.route('/:childId/parents/:parentId')
  .delete(removeParentFromChild);

module.exports = router;
