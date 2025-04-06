const express = require('express');
const {
  getUsers,
  getUser,
  createUser,
  updateUser,
  deleteUser
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

module.exports = router;
