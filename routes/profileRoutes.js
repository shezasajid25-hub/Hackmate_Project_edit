const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Profile = require('../models/Profile');

// Define a test route to verify the file works
router.get('/', (req, res) => {
  res.json({ message: "Profile routes are active" });
});

// GET /api/profile/status?user_name=username
router.get('/status', async (req, res) => {
  try {
    const { user_name } = req.query;
    if (!user_name) {
      return res.status(400).json({ detail: "user_name parameter is required" });
    }
    const user = await User.findOne({ user_name });
    if (!user) {
      return res.status(404).json({ detail: "User not found" });
    }
    res.json({
      user_name: user.user_name,
      first_name: user.first_name,
      has_onboarded: user.has_onboarded
    });
  } catch (error) {
    res.status(500).json({ detail: error.message });
  }
});

// POST /api/profile/onboard
router.post('/onboard', async (req, res) => {
  try {
    const { user_name, status, skills, linkedin_url, github } = req.body;
    if (!user_name) {
      return res.status(400).json({ detail: "user_name is required" });
    }

    const user = await User.findOne({ user_name });
    if (!user) {
      return res.status(404).json({ detail: "User not found" });
    }

    // Parse skills to format expected by Profile schema
    const formattedSkills = (skills || []).map(skillName => ({
      name: skillName.trim(),
      proficiency: 'intermediate',
      category: 'General'
    }));

    // Create or update Profile
    let profile = await Profile.findOne({ user: user._id });
    if (!profile) {
      profile = new Profile({
        user: user._id,
        status: status || 'looking_for_team',
        skills: formattedSkills,
        social: {
          linkedin: linkedin_url || '',
          github: github || user.github || ''
        }
      });
    } else {
      profile.status = status || profile.status;
      profile.skills = formattedSkills.length ? formattedSkills : profile.skills;
      profile.social = {
        linkedin: linkedin_url || profile.social.linkedin,
        github: github || profile.social.github || user.github
      };
    }
    await profile.save();

    // Update User onboarding status
    user.has_onboarded = true;
    // Sync skills and github if needed
    if (skills && skills.length) {
      user.skills = skills;
    }
    if (github) {
      user.github = github;
    }
    await user.save();

    res.json({
      success: true,
      message: "Onboarding complete!",
      user: {
        user_name: user.user_name,
        first_name: user.first_name,
        has_onboarded: true
      }
    });
  } catch (error) {
    res.status(500).json({ detail: error.message });
  }
});

module.exports = router;