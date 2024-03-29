const crypto = require('crypto');
const ErrorResponse = require('../utils/errorResponse');
const asyncHandler = require('../middleware/async');
const sendEmail = require('../utils/sendEmail');
const User = require('../models/User');
const jwt = require('jsonwebtoken');

// @desc     Register user
// @route    POST /api/v1/auth/register
// @access   Public
exports.register = asyncHandler(async (req, res, next) => {
  const { name, email, password, role } = req.body;

  // Create user
  const user = User.create({
    name,
    email,
    password,
    role,
  });
  sendTokenResponse(user, 200, res);
});

// @desc     Login user
// @route    GET /api/v1/auth/login
// @access   Public
exports.login = asyncHandler(async (req, res, next) => {
  const { email, password } = req.body;

  // Validate email and password
  if (!email || !password) {
    return next(new ErrorResponse('Please provide an email and password', 400));
  }

  // Check for user
  try{
    const user = await User.findOne({ email }).select('+password');
    if (!user) {
      return next(new ErrorResponse('Invalid credentials', 401));
    }
    try{
      const isMatch = await user.matchPassword(password);
      if (!isMatch) {
        return next(new ErrorResponse('Invalid credentials', 401));
      }
      sendTokenResponse(user, 200, res);
    }
    catch(err){
      console.log(err);
      res.status(400).json({ success: false, data: "Unable to validate credentials" }); 
    }
  }
  catch(err){
    console.log(err);
    res.status(400).json({ success: false, data: "Unable to retrieve user details" }); 
  }
});

// @desc     Log out user / clear cookie
// @route    GET /api/v1/auth/logout
// @access   Private
exports.logout = asyncHandler(async (req, res, next) => {
  res.cookie('token', 'none', {
    expires: new Date(Date.now() + 10 * 1000),
    httpOnly: true,
  });

  res.status(200).json({ success: true, data: {} });
});

// @desc     Get Current user
// @route    GET /api/v1/auth/me
// @access   Private
exports.getMe = asyncHandler(async (req, res, next) => {
  try{  
    const user = await User.findById(req.user.id);
    res.status(200).json({ success: true, data: user });
  }
  catch(err){
    console.log(err);
    res.status(400).json({ success: false, data: "Unable to get user details. Please try again." });  
  }
});

// @desc     Update user details
// @route    PUT /api/v1/auth/updatedetails
// @access   Private
exports.updateDetails = asyncHandler(async (req, res, next) => {
  const fieldsToUpdate = {
    name: req.body.name,
    email: req.body.email,
  };
  try{  
    const user = await User.findByIdAndUpdate(req.user.id, fieldsToUpdate, {
      new: true,
      runValidators: true,
    });
    res.status(200).json({ success: true, data: user });
  }
  catch(err){
    console.log(err);
    res.status(400).json({ success: false, data: "Unable to update details. Please try again." });   
  }
});

// @desc     Update user password
// @route    PUT /api/v1/auth/updatepassword
// @access   Private
exports.updatePassword = asyncHandler(async (req, res, next) => {
  let user = {};
  try{
    user = await User.findById(req.user.id).select('+password');
  }
  catch(err){
    console.log(err);
    res.status(400).json({ success: false, data: "Unable to update password. Please try again." });  
  }
  // Check current password
  if (!(await user.matchPassword(req.body.currentPassword))) {
    return next(new ErrorResponse('Incorrect Password', 401));
  }
  user.password = req.body.newPassword;
  try{
    await user.save();
    sendTokenResponse(user, 200, res);
  }
  catch(err){
    console.log(err);
    res.status(400).json({ success: false, data: "Unable to update password. Please try again." });  
  }
});

// @desc     Forgot Password
// @route    POST /api/v1/auth/forgotpassword
// @access   Public
exports.forgotPassword = asyncHandler(async (req, res, next) => {
  let user = "";
  try{
    user = await User.findOne({ email: req.body.email });
  }
  catch(err){
    console.log(err);
    res.status(400).json({ success: false, data: "Unable to get user details. Please try again." });
    return;
  }

  if (!user) {
    return next(new ErrorResponse('There is no user with that email', 404));
  }

  // Get reset token
  const resetToken = user.getResetPasswordToken();
  try{
    await user.save({ validateBeforeSave: false }); 
  }
  catch(err){
    console.log(err);
    res.status(400).json({ success: false, data: "Unable to update password. Please try again." });  
    return;
  }

  // Create reset url
  const resetUrl = `${req.protocol}://${req.get(
    'host'
  )}/api/v1/auth/resetpassword/${resetToken}`;

  const message = `Hey, we see you wanted to reset your password. Please make a PUT request to : \n\n ${resetUrl}`;

  try {
    await sendEmail({
      email: user.email,
      subject: 'Reset Password',
      message,
    });

    res.status(200).json({ success: true, data: 'Email sent' });
  } catch (err) {
    console.log(err);
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;

    await user.save({ validateBeforeSave: false });

    return next(new ErrorResponse('Email could not be sent', 500));
  }

  res.status(200).json({ success: true, data: user });
});

// @desc     Reset Password
// @route    PUT /api/v1/auth/resetpassword/:resettoken
// @access   Public
exports.resetPassword = asyncHandler(async (req, res, next) => {
  //Get hashed reset token
  const resetPasswordToken = crypto
    .createHash('sha256')
    .update(req.params.resettoken)
    .digest('hex');
  let user = "";
  try{
     user = await User.findOne({
      resetPasswordToken,
      resetPasswordExpire: { $gt: Date.now() },
    });
  }
  catch(err){
    console.log(err);
    res.status(400).json({ success: false, data: "Unable to reset password. Please try again." });
    return;
  }

  if (!user) {
    return next(new ErrorResponse('Invalid token', 400));
  }

  //Set new password
  user.password = req.body.password;
  user.resetPasswordToken = undefined;
  user.resetPasswordExpire = undefined;
  try{
    await user.save();
  }
  catch(err){
    console.log(err);
    res.status(400).json({ success: false, data: "Unable to reset password. Please try again." });
    return;
  }
  sendTokenResponse(user, 200, res);
});

// Get token from model, create cookie and send response
const sendTokenResponse = (user, statusCode, res) => {
  const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE,
  });

  const options = {
    expires: new Date(
      Date.now() + process.env.JWT_COOKIE_EXPIRE * 24 * 60 * 60 * 1000
    ),
    httpOnly: true,
  };

  if (process.env.NODE_ENV === 'production') {
    options.secure = true;
  }

  res
    .status(statusCode)
    .cookie('token', token, options)
    .json({ success: true, token });
};
