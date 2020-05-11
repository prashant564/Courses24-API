const express = require('express');

const {
  register,
  login,
  getMe,
  forgotPassword,
} = require('../controllers/auth');

const router = express.Router();

const { protect } = require('../middleware/auth');

router
  .post('/register', register)
  .post('/login', login)
  .post('/forgotpassword', forgotPassword)
  .get('/me', protect, getMe);
module.exports = router;
