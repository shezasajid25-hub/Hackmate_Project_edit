const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  first_name: { type: String, required: true },
  last_name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  user_name: { type: String, required: true, unique: true },
  password: { type: String, required: true }, // The hashed password
  role: { type: String, required: true },
  github: { type: String },
  skills: [String]
}, { timestamps: true });

module.exports = mongoose.model('User', UserSchema);