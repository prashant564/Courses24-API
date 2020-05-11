const express = require('express');

const router = express.Router({ mergeParams: true });

const {
  getCourses,
  getCourse,
  addCourse,
  updateCourse,
  deleteCourse,
} = require('../controllers/courses');

const { protect, authorizeRoles } = require('../middleware/auth');

const Course = require('../models/Course');
const advancedResults = require('../middleware/advancedResults');

router
  .route('/')
  .get(
    advancedResults(Course, { path: 'bootcamp', select: 'name description' }),
    getCourses
  )
  .post(protect, authorizeRoles('publisher', 'admin'), addCourse);

router
  .route('/:id')
  .get(getCourse)
  .put(protect, authorizeRoles('publisher', 'admin'), updateCourse)
  .delete(protect, authorizeRoles('publisher', 'admin'), deleteCourse);

module.exports = router;
