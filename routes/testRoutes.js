// routes/testRoutes.js
const express = require('express');
const testController = require('../controllers/testController');
const router = express.Router();

// Routes for tests
router.post('/', testController.createTest);
router.get('/', testController.getTests);
router.get('/:id', testController.getTestById);
router.get('/course/:id', testController.getTestByCourseId);
router.put('/:id', testController.updateTest);
router.post('/save', testController.saveTestResults);
router.delete('/:id', testController.deleteTest);
router.get('/test-results/:userId', testController.getTestResultsByUser);

module.exports = router;
