const mongoose = require('mongoose');

const ProfileSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  status: { 
    type: String, 
    enum: ['looking_for_team', 'open_to_offers', 'solo', 'not_available'],
    default: 'looking_for_team' 
  },
  skills: [{
    name: { type: String, required: true },
    proficiency: { type: String, enum: ['novice', 'intermediate', 'advanced', 'expert'] },
    category: { type: String }
  }],
  projects: [{
    title: String,
    repo_url: String,
    demo_url: String,
    description: String
  }],
  social: {
    github: String,
    linkedin: String,
    portfolio: String
  }
});

module.exports = mongoose.model('Profile', ProfileSchema);