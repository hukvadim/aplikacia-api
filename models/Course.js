const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const courseSchema = new Schema({
    title: { type: String, required: true },
    description: { type: String, required: false },
    article: { type: String, required: false }, // Зробили необов'язковим
    video_link: { type: String },
    publish: { type: String, enum: ['yes', 'no', 'canceled'] },
    img: { type: String },
    files: { type: String, default: '' }, // Гарантовано буде рядком
    created_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    created_at: { type: Date, default: Date.now }
});

const Course = mongoose.model('Course', courseSchema);
module.exports = Course;
