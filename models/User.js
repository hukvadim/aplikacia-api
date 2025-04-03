const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const userSchema = new Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    publish: { type: String, enum: ['yes', 'no', 'canceled'], default: 'yes' },
    role: { type: String, enum: ['user', 'teacher', 'admin'], required: true },
    created_at: { type: Date, default: Date.now },
    token: { type: String }
});

const User = mongoose.model('User', userSchema);
module.exports = User;