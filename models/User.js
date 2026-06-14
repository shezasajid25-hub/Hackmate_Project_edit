const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  first_name: { type: String, required: true },
  last_name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  user_name: { type: String, required: true, unique: true },
  password: { type: String, required: true }, // The hashed password
  role: { type: String, required: true },
  github: { type: String },
  linkedin_url: { type: String },
  linkedin: { type: String },
  skills: [String],
  location: { type: String, default: '' },
  achievements: { type: String, default: '' },
  has_onboarded: { type: Boolean, default: false },

  // ─── REGISTRATION STATE ENGINE POOL ───
  // Tracks exactly which hackathons this specific user has joined
  registered_hackathons: { type: [String], default: [] }
}, { timestamps: true });

module.exports = mongoose.model('User', UserSchema);