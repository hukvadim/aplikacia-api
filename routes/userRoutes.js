
const express = require('express');
const userController = require('../controllers/userController');
const authController = require('../controllers/authController');
const router = express.Router();

router.get('/', userController.getUsers);
router.post('/', userController.addUser);
router.post('/register', authController.registerUser);
router.post('/login', authController.loginUser);
router.post('/auth', authController.authUser);
router.put('/:id', authController.updateUser);
router.get('/answers/:id', userController.userAnswers);
router.get('/setAdmin/:id', userController.setAdmin);
router.get('/:id', userController.getUserById);
router.get("/admin/teachers", userController.getAdminTeachers);
router.post("/admin/teachers", userController.updateTeacherStatus);
router.delete('/:id', userController.deleteUser);
router.get('/teacher/students/:teacher_id', userController.getStudentsForTeacher);
router.get("/teacher/analytics/:id", userController.getTeacherAnalytics);


module.exports = router;