const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const User = require('../models/User'); // Імпортуємо модель користувача
const Answer = require('../models/Answer'); // Модель відповідей
const Test = require('../models/Test');     // Модель тестів
const Course = require('../models/Course'); // Модель курсів


// Створення користувача
exports.addUser = async (req, res) => {
    const { name, email, password, role } = req.body;

    if (!name || !email || !password || !role) {
        return res.status(400).json({ error: 'Name, email, password, and role are required' });
    }

    try {
        // Хешування пароля
        const hashedPassword = await bcrypt.hash(password, 10);

        // Створення нового користувача
        const newUser = new User({
            name,
            email,
            password: hashedPassword,
            role
        });

        // Збереження користувача в базі даних
        await newUser.save();
        res.status(201).json({ message: 'User added successfully', user: newUser });
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: 'Failed to add user' });
    }
};

// Отримати всіх користувачів
exports.getUsers = async (req, res) => {
    
    try {
        const users = await User.find();
        res.status(200).json(users);
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: 'Failed to fetch users' });
    }
};

// Отримати користувача за ID
exports.getUserById = async (req, res) => {
    const { id } = req.params;

    try {
        // Перевіряємо, чи існує користувач з таким ID
        const user = await User.findById(id);

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Повертаємо дані користувача
        res.status(200).json(user);
    } catch (err) {
        console.error(err.message);
        return res.status(500).json({ error: 'Failed to fetch user' });
    }
};



// Функція для отримання відповідей користувача з назвами курсів
exports.userAnswers = async (req, res) => {
    try {
        const userId = req.params.id;

        // Отримуємо відповіді користувача разом з назвами тестів і курсів
        const answers = await Answer.find({ user_id: userId })
            .populate({
                path: 'test_id',
                select: 'title course_id',
                populate: {
                    path: 'course_id',
                    select: 'title'
                }
            });

        // Форматуємо відповідь
        const formattedAnswers = answers.map(answer => ({
            answer_id: answer._id,
            answers: answer.answers,
            test_title: answer.test_id.title,
            course_title: answer.test_id.course_id.title
        }));

        res.json({ answers: formattedAnswers });
    } catch (error) {
        console.error('Error fetching user answers:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};



// Отримати всіх вчителів, у яких publish = 'no'
exports.getAdminTeachers = async (req, res) => {
    try {
        // Знайдемо всіх вчителів з publish = 'no'
        const teachers = await User.find({ role: 'teacher', publish: 'no' }, 'id name email created_at');

        // Якщо вчителі не знайдені
        if (!teachers.length) {
            return res.status(404).json({ error: 'No teachers found' });
        }

        res.status(200).json(teachers);
    } catch (err) {
        res.status(500).json({ error: 'Failed to retrieve teachers' });
    }
};



// Оновлення статусу публікації вчителя
exports.updateTeacherStatus = async (req, res) => {
    const { teacherId, publish } = req.body;

    // Перевірка коректності значення publish
    if (!['yes', 'no', 'canceled'].includes(publish)) {
        return res.status(400).json({ error: 'Invalid publish status' });
    }

    try {
        // Знайдемо користувача за ID та перевіримо, чи є він вчителем
        const user = await User.findOne({ _id: teacherId, role: 'teacher' });

        if (!user) {
            return res.status(404).json({ error: 'Teacher not found' });
        }

        // Оновлюємо статус публікації
        user.publish = publish;

        await user.save();

        res.status(200).json({ message: 'Teacher status updated successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to update teacher status' });
    }
};



// Робимо користувача адміністратором
exports.setAdmin = async (req, res) => {
    const { id } = req.params;

    try {
        // Перевіряємо, чи існує користувач з таким id
        const user = await User.findById(id);
        
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Оновлюємо роль користувача на "admin"
        user.role = 'admin';
        await user.save(); // Зберігаємо зміни

        return res.status(200).json({ message: 'User role updated to admin successfully' });
    } catch (err) {
        console.error(err.message);
        return res.status(500).json({ error: 'Failed to update user role' });
    }
};


// Видалення користувача
exports.deleteUser = async (req, res) => {
    const { id } = req.params;

    try {
        const result = await User.deleteOne({ _id: id });

        // Перевіряємо, чи був знайдений і видалений користувач
        if (result.deletedCount === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        res.status(200).json({ message: 'User deleted successfully' });
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: 'Failed to delete user' });
    }
};




// Get students assigned to a teacher based on user_course_id
exports.getStudentsForTeacher = async (req, res) => {
    const { teacher_id } = req.params;

    if (!teacher_id) {
        return res.status(400).json({ error: 'Teacher ID is required' });
    }

    try {
        // Знайти всі відповіді для курсу цього викладача
        const answers = await Answer.find({ user_course_id: teacher_id }).populate('user_id', 'id name email');

        if (answers.length === 0) {
            return res.status(404).json({ error: 'No students found for this teacher' });
        }

        // Вибираємо лише унікальних студентів
        const students = answers
            .map(answer => answer.user_id)
            .filter((value, index, self) => self.findIndex(v => v.id === value.id) === index); // Фільтруємо унікальних студентів

        res.status(200).json(students);
    } catch (err) {
        console.error('Error retrieving students:', err.message);
        res.status(500).json({ error: 'Failed to retrieve students' });
    }
};


// Get teacher analytics
exports.getTeacherAnalytics = async (req, res) => {
    const teacherId = req.params.id;

    try {
        // Перетворюємо teacherId на ObjectId, якщо це ще не так
        const teacherObjectId = new mongoose.Types.ObjectId(teacherId);

        // Агрегація для підрахунку активних студентів, завершених курсів та середнього прогресу
        const analytics = await Answer.aggregate([
            {
                $match: { user_course_id: teacherObjectId } // Фільтруємо за user_course_id як ObjectId
            },
            {
                $group: {
                    _id: null,
                    active_students: { $addToSet: "$user_id" }, // Створюємо набір унікальних студентів
                    completed_courses: { $addToSet: "$course_id" }, // Створюємо набір унікальних курсів
                    total_answers_length: { $sum: { $strLenCP: "$answers" } } // Підраховуємо загальну довжину всіх відповідей
                }
            },
            {
                $project: {
                    active_students: { $size: "$active_students" }, // Підраховуємо кількість унікальних студентів
                    completed_courses: { $size: "$completed_courses" }, // Підраховуємо кількість унікальних курсів
                    average_progress: {
                        $cond: {
                            if: { $eq: [{ $size: "$active_students" }, 0] }, 
                            then: 0, 
                            else: { $round: [{ $divide: ["$total_answers_length", { $size: "$active_students" }] }, 2] }
                        }
                    }
                }
            }
        ]);

        if (!analytics.length) {
            return res.status(404).json({ error: "No analytics found for this teacher" });
        }

        const { active_students, completed_courses, average_progress } = analytics[0];

        res.json({
            active_students,
            completed_courses,
            average_progress: average_progress * 10 // Перемножуємо на 10 для досягнення потрібного результату
        });
    } catch (err) {
        console.error("Error getting analytics:", err.message);
        res.status(500).json({ error: "Failed to retrieve teacher analytics" });
    }
};