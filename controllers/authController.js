const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Функція для отримання користувача за email
const getUserByEmail = async (email) => {
    return await User.findOne({ email });
};

// Функція для реєстрації користувача
exports.registerUser = async (req, res) => {
    try {
        const { name, email, password, role } = req.body;

        if (!name || !email || !password || !role) {
            return res.status(400).json({ error: 'All fields are required' });
        }

        if (!['user', 'teacher'].includes(role)) {
            return res.status(400).json({ error: 'Invalid role. Role must be "user" or "teacher".' });
        }

        const existingUser = await getUserByEmail(email);
        if (existingUser) {
            return res.status(400).json({ error: 'Email is already registered' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const publish = role === 'teacher' ? 'no' : 'yes';

        const newUser = new User({
            name,
            email,
            password: hashedPassword,
            role,
            publish
        });

        await newUser.save();

        res.status(201).json({ message: 'User registered successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to register user' });
    }
};

// Функція для авторизації користувача
exports.loginUser = async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password are required' });
        }

        // Отримуємо користувача
        const user = await getUserByEmail(email);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Перевіряємо пароль
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({ error: 'Incorrect email or password' });
        }

        // Створюємо JWT токен
        const token = jwt.sign(
            { id: user._id, role: user.role },
            process.env.JWT_SECRET || "sdfsd234234sdfs",
            { expiresIn: '1h' }
        );

        // Оновлюємо токен у користувача
        user.token = token;
        await user.save();

        // Відправляємо відповідь
        res.status(200).json({
            message: 'User logged in successfully',
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                publish: user.publish,
            },
            token,
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to log in user' });
    }
};


// Функція для перевірки токену та отримання користувача
exports.authUser = async (req, res) => {
    try {
        const token = req.headers['authorization']?.split(' ')[1];
        if (!token) {
            return res.status(401).json({ error: 'No token provided' });
        }

        // Розшифровуємо токен
        const decoded = jwt.verify(token, process.env.JWT_SECRET || "sdfsd234234sdfs");

        // Отримуємо користувача з бази без пароля
        const user = await User.findById(decoded.id).select('-password');
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Відправляємо користувача з id
        res.status(200).json({user: {
            ...user.toObject(), // Приводимо до об'єкта
            id: user._id // Додаємо id
        }});
    } catch (error) {
        console.error(error);
        res.status(401).json({ error: 'Invalid token' });
    }
};


// Оновлення користувача
exports.updateUser = async (req, res) => {
    const { id } = req.params;
    const { name, email, password, publish } = req.body;

    try {
        // Отримуємо поточного користувача
        const user = await User.findById(id);

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Формуємо оновлені дані, залишаючи старі, якщо нові не передані
        const updatedName = name || user.name;
        const updatedEmail = email || user.email;
        const updatedRole = user.role;
        let updatedPassword = user.password;
        let updatedPublish = user.publish; // Залишаємо старе значення

        if (password) {
            updatedPassword = await bcrypt.hash(password, 10);
        }

        if (user.role === 'teacher' && publish !== undefined) {
            // Якщо роль teacher, оновлюємо статус publish
            updatedPublish = publish;
        }

        // Оновлюємо користувача в базі даних
        user.name = updatedName;
        user.email = updatedEmail;
        user.password = updatedPassword;
        user.role = updatedRole;
        user.publish = updatedPublish;

        await user.save();

        res.status(200).json({ message: 'User updated successfully' });

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
