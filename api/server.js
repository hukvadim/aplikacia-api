const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const mongoose = require('mongoose');
const userRoutes = require('../routes/userRoutes');
const courseRoutes = require('../routes/courseRoutes');
const testRoutes = require('../routes/testRoutes');

const app = express();
app.use(cors());
app.use(bodyParser.json());

// Обслуговування статичних файлів
app.use('/public', express.static('public'));

// Підключення до MongoDB
mongoose.connect('mongodb+srv://vadim:wDVta4FguqpH3Eq4@cluster0.trgllhe.mongodb.net/cluster?retryWrites=true&w=majority&appName=Cluster0')
.then(() => console.log('✅ Успішне підключення до MongoDB'))
.catch(err => console.error('❌ Помилка підключення до MongoDB:', err));

// API статус
app.get('/', (req, res) => { res.json('API start!'); });

// Реєструємо маршрути
app.use('/users', userRoutes);
app.use('/courses', courseRoutes);
app.use('/tests', testRoutes);

// Vercel API handler
// module.exports = app;

// Запуск сервера
const PORT = 5000;
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
