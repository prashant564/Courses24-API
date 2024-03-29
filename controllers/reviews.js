const ErrorResponse = require('../utils/errorResponse');
const asyncHandler = require('../middleware/async');
const Review = require('../models/Review');
const Bootcamp = require('../models/Bootcamp');

// @desc     Get reviews
// @route    GET /api/v1/reviews
// @route    GET /api/v1/bootcamps/:bootcampId/reviews
// @access   Public
exports.getReviews = asyncHandler(async (req, res, next) => {
  // check if a bootcamp id is given
  if (req.params.bootcampId) {
    let reviews = {};
    try{
      reviews = await Review.find({ bootcamp: req.params.bootcampId });
      return res.status(200).json({
        success: true,
        count: reviews.length,
        data: reviews,
      });
    }
    catch(err){
      console.log(err);
      res.status(400).json({
        success:false,
        data:"Unable to fetch reviews at the moment. Please try again later"
      })
    }
  } else {
    res.status(200).json(res.advancedResults);
  }
});

// @desc     Get single review
// @route    GET /api/v1/reviews/:id
// @access   Public
exports.getReview = asyncHandler(async (req, res, next) => {
  try{
    const review = await Review.findById(req.params.id).populate({
      path: 'bootcamp',
      select: 'name description',
    });

    if (!review) {
      return next(
        new ErrorResponse(`No review found with ${req.params.id}`, 404)
      );
    }

    res.status(200).json({ success: true, data: review });
  }
  catch(err){
    console.log(err);
    res.status(400).json({
      success:false,
      data:"Unable to fetch review at the moment. Please try again later"
    })
  }
});

// @desc     Add review
// @route    POST /api/v1/bootcamps/:bootcampId/reviews
// @access   Private
exports.createReview = asyncHandler(async (req, res, next) => {
  req.body.bootcamp = req.params.bootcampId;
  req.body.user = req.user.id;
  try{
    const bootcamp = await Bootcamp.findById(req.params.bootcampId);

    if (!bootcamp) {
      return next(
        new ErrorResponse(
          `No bootcamp with id ${req.params.bootcampId} found`,
          404
        )
      );
    }

    const review = await Review.create(req.body);

    res.status(201).json({ success: true, data: review });    
  }
  catch(err){
    console.log(err);
    res.status(400).json({
      success:false,
      data:"Unable to create review at the moment. Please try again later"
    })
  }
  
});

// @desc     Update review
// @route    PUT /api/v1/reviews/:id
// @access   Private
exports.updateReview = asyncHandler(async (req, res, next) => {
  try{
    let review = await Review.findById(req.params.id);

    if (!review) {
      return next(
        new ErrorResponse(`No review with id ${req.params.id} found`, 404)
      );
    }

    // Make sure review belongs to user or user is admin
    if (review.user.toString() !== req.user.id && req.user.role !== 'admin') {
      return next(new ErrorResponse(`Not authorized to update review`, 401));
    }

    review = await Review.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });

    res.status(200).json({ success: true, data: review });
  }
  catch(err){
    console.log(err);
    res.status(400).json({
      success:false,
      data:"Unable to update review at the moment. Please try again later"
    });
    return;
  }
});

// @desc     Delete review
// @route    DELETE /api/v1/reviews/:id
// @access   Private
exports.deleteReview = asyncHandler(async (req, res, next) => {
  try{
    let review = await Review.findById(req.params.id);

    if (!review) {
      return next(
        new ErrorResponse(`No review with id ${req.params.id} found`, 404)
      );
    }

    // Make sure review belongs to user or user is admin
    if (review.user.toString() !== req.user.id && req.user.role !== 'admin') {
      return next(new ErrorResponse(`Not authorized to update review`, 401));
    }

    await Review.remove();

    res.status(200).json({ success: true, data: {} });
  }
  catch(err){
    console.log(err);
    res.status(400).json({
      success:false,
      data:"Unable to delete review at the moment. Please try again later"
    });
    return;
  }
});
