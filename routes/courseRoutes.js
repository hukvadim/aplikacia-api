// routes/courseRoutes.js
const express = require('express');
const courseController = require('../controllers/courseController');
const router = express.Router();

router.get('/', courseController.getCourses);
router.post('/', courseController.createCourse);
router.delete('/:id', courseController.deleteCourse);
router.get('/:id', courseController.getCourseById);
router.put('/:id', courseController.updateCourse);
router.get('/teacher/:id', courseController.getTeacherCourses);

module.exports = router;