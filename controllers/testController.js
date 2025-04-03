const path = require('path');
const Test = require('../models/Test');
const Answer = require('../models/Answer');

// Create a test
exports.createTest = async (req, res) => {
    const { course_id, questions } = req.body;

    // Validate required fields
    if (!course_id || !questions) {
        return res.status(400).json({ error: 'Course ID and questions are required' });
    }

    // Перетворюємо масив питань у JSON-рядок перед збереженням
    const questionsJson = JSON.stringify(questions);

    try {
        // Створюємо новий тест
        const newTest = new Test({
            course_id, 
            title: 'Test name',  // Можна також передати title через req.body, якщо потрібно
            questions: questionsJson
        });

        // Зберігаємо тест у базі даних
        const savedTest = await newTest.save();
        
        // Відправляємо відповідь з ID та повідомленням
        res.status(201).json({
            id: savedTest._id,
            message: 'Test added successfully'
        });
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: 'Failed to add test' });
    }
};



// Get all tests
exports.getTests = async (req, res) => {
    try {
        // Отримуємо всі тести з MongoDB
        const tests = await Test.find();

        // Розпарсити питання з JSON-рядка в масив перед поверненням
        const formattedTests = tests.map(test => ({
            ...test.toObject(),
            questions: JSON.parse(test.questions)
        }));

        res.status(200).json(formattedTests);
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: 'Failed to fetch tests' });
    }
};


// Get a test by ID
exports.getTestById = async (req, res) => {
    const { id } = req.params;

    try {
        // Знайти тест за ID у MongoDB
        const test = await Test.findById(id);

        // Якщо тест не знайдений
        if (!test) {
            return res.status(404).json({ error: 'Test not found' });
        }

        // Розпарсити питання з JSON-рядка в масив
        test.questions = JSON.parse(test.questions);

        // Відправити тест у відповіді
        res.status(200).json(test);
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: 'Failed to fetch test' });
    }
};



// Get tests by course ID
// Get a single test by course ID
exports.getTestByCourseId = async (req, res) => {
    const { id } = req.params;

    try {
        // Знайти перший тест за course_id в MongoDB
        const test = await Test.findOne({ course_id: id });

        // Якщо тест не знайдений
        if (!test) {
            return res.status(404).json({ error: 'No test found for this course' });
        }

        // Розпарсити питання для тесту
        const formattedTest = {
            ...test.toObject(),
            questions: JSON.parse(test.questions)
        };

        // Відправити тест у відповіді
        res.status(200).json(formattedTest);
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: 'Failed to fetch test' });
    }
};



// Update a test
exports.updateTest = async (req, res) => {
    const { id } = req.params;
    const { course_id, title, questions } = req.body;

    // Перетворити питання у JSON-рядок
    const questionsJson = JSON.stringify(questions);

    try {
        // Оновити тест у MongoDB
        const updatedTest = await Test.findByIdAndUpdate(
            id, 
            { course_id, title, questions: questionsJson }, 
            { new: true, runValidators: true }
        );

        // Якщо тест не знайдений
        if (!updatedTest) {
            return res.status(404).json({ error: 'Test not found' });
        }

        res.status(200).json({ message: 'Test updated successfully', test: updatedTest });
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: 'Failed to update test' });
    }
};



// Save or update test answers and result
exports.saveTestResults = async (req, res) => {
    const { test_id, course_id, user_course_id, user_id, answers } = req.body;

    // Перевірка на обов'язкові поля
    if (!test_id || !user_id || !answers) {
        return res.status(400).json({ error: 'Test ID, user ID, and answers are required' });
    }

    // Перетворюємо масив відповідей у JSON-рядок
    const answersJson = JSON.stringify(answers);

    try {
        // Перевіряємо, чи вже існує запис для цього користувача та тесту
        let answer = await Answer.findOne({ test_id, user_id });

        if (answer) {
            // Якщо запис існує, оновлюємо його
            answer.answers = answersJson;
            answer.course_id = course_id;
            answer.user_course_id = user_course_id;

            // Зберігаємо оновлений запис
            await answer.save();

            res.status(200).json({ message: 'Answers updated successfully', id: answer._id });
        } else {
            // Якщо запису немає, створюємо новий
            const newAnswer = new Answer({
                test_id,
                user_id,
                answers: answersJson,
                course_id,
                user_course_id
            });

            // Зберігаємо новий запис
            await newAnswer.save();

            res.status(201).json({ message: 'Answers saved successfully', id: newAnswer._id });
        }
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: 'Failed to save or update answers' });
    }
};



// Delete a test
exports.deleteTest = async (req, res) => {
    const { id } = req.params;

    try {
        // Знайти та видалити тест за ID
        const result = await Test.deleteOne({ _id: id });

        // Якщо тест не знайдений
        if (result.deletedCount === 0) {
            return res.status(404).json({ error: 'Test not found' });
        }

        res.status(200).json({ message: 'Test deleted successfully' });
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: 'Failed to delete test' });
    }
};






// Get test results by user ID
exports.getTestResultsByUser = async (req, res) => {
    const { user_id } = req.params;

    if (!user_id) {
        return res.status(400).json({ error: 'User ID is required' });
    }

    try {
        // Знайти всі відповіді користувача
        const answers = await Answer.find({ user_id });

        // Якщо жодних відповідей не знайдено
        if (answers.length === 0) {
            return res.status(404).json({ error: 'No test results found for this user' });
        }

        // Отримуємо назви тестів, до яких відповідав користувач
        const testIds = answers.map(answer => answer.test_id);
        const tests = await Test.find({ _id: { $in: testIds } });

        // Форматуємо результати
        const formattedResults = answers.map(answer => {
            const test = tests.find(t => t._id.toString() === answer.test_id.toString());
            return {
                id: answer._id,
                test_id: answer.test_id,
                test_title: test ? test.title : 'Test not found',
                answers: JSON.parse(answer.answers)
            };
        });

        res.status(200).json(formattedResults);
    } catch (err) {
        console.error('Помилка отримання результатів тестів:', err.message);
        res.status(500).json({ error: 'Failed to fetch test results' });
    }
};




