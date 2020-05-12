const express = require('express');

const {
  getUsers,
  getUser,
  createUser,
  updateUser,
  deleteUser,
} = require('../controllers/users');

const User = require('../models/User');

const router = express.Router();

const { protect, authorizeRoles } = require('../middleware/auth');
const advancedResults = require('../middleware/advancedResults');

router.use(protect);
router.use(authorizeRoles('admin'));

router.route('/').get(advancedResults(User), getUsers).post(createUser);

router.route('/:id').get(getUser).put(updateUser).delete(deleteUser);

module.exports = router;
