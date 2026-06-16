const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Profile = require('../models/Profile');

// Define a test route to verify the file works
router.get('/', (req, res) => {
  res.json({ message: "Profile routes are active" });
});

/**
 * ─── INSTANT STATUS CHECK (State A vs State B) ───────────────────────
 * This route handles the frictionless check immediately following authentication.
 */
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

    // State A: Profile Incomplete -> The frontend will see has_onboarded: false and lock them into the Onboarding Portal
    // State B: Profile Complete   -> The frontend will see has_onboarded: true and funnel them straight to the Dashboard
    res.json({
      user_name: user.user_name,
      first_name: user.first_name,
      has_onboarded: user.has_onboarded
    });

  } catch (error) {
    res.status(500).json({ detail: error.message });
  }
});

/**
 * ─── MANDATORY ONBOARDING SUBMISSION ──────────────────────────────────
 * When fields are submitted, this updates the flags to move the user to State B.
 */
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

    // Create or update Profile setup
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

    // Update User onboarding status seamlessly to True (Flips State A -> State B)
    user.has_onboarded = true;

    // Sync skills and github arrays onto the user model
    if (skills && skills.length) {
      user.skills = skills;
    }
    if (github) {
      user.github = github;
    }

    await user.save();

    // Return clear confirmation so frontend can immediately redirect to Dashboard
    res.json({
      success: true,
      message: "Onboarding complete! Welcome to Grid!",
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

/**
 * ─── FETCH LIVE PROFILE DATA ─────────────────────────────────────────
 * Returns fresh user data from the DB (used when the profile modal opens)
 */
router.get('/me', async (req, res) => {
  try {
    const { user_name } = req.query;
    if (!user_name) return res.status(400).json({ detail: 'user_name required' });

    const user = await User.findOne({ user_name }).select('-password');
    if (!user) return res.status(404).json({ detail: 'User not found' });

    res.json({
      user_name: user.user_name,
      first_name: user.first_name,
      last_name: user.last_name,
      email: user.email,
      location: user.location || '',
      achievements: user.achievements || '',
      github: user.github || user.linkedin_url || '',
      linkedin: user.linkedin || user.linkedin_url || '',
      skills: user.skills || [],
      has_onboarded: user.has_onboarded
    });
  } catch (error) {
    res.status(500).json({ detail: error.message });
  }
});

/**
 * ─── RADAR SCAN — REGISTERED USERS ONLY ──────────────────────────────
 * Returns only real on-boarded users from the database.
 */
router.get('/scan', async (req, res) => {
  try {
    const skillsQuery = req.query.skills || '';
    const searchSkills = skillsQuery
      .split(',')
      .map(s => s.trim().toLowerCase())
      .filter(Boolean);

    if (!searchSkills.length) {
      return res.status(400).json({ detail: 'skills query parameter is required' });
    }

    const users = await User.find({
      has_onboarded: true,
      skills: { $exists: true, $ne: [] }
    }).select('-password');

    const matches = users
      .map(user => {
        const userSkills = (user.skills || []).map(s => s.toLowerCase());
        const matched = searchSkills.filter(skill => userSkills.some(us => us.includes(skill)));
        const missing = searchSkills.filter(skill => !userSkills.some(us => us.includes(skill)));
        const score = searchSkills.length ? Math.round((matched.length / searchSkills.length) * 100) : 0;

        return {
          user_name: user.user_name,
          name: `${user.first_name} ${user.last_name}`,
          score,
          matched,
          missing,
          linkedin: user.linkedin || user.linkedin_url || '',
          github: user.github || '',
          location: user.location || '',
          achievements: user.achievements || ''
        };
      })
      .filter(user => user.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 20);

    res.json({ users: matches });
  } catch (error) {
    res.status(500).json({ detail: error.message });
  }
});

/**
 * ─── ONBOARDING SAVE ENDPOINT ────────────────────────────────────────
 * Called from the onboarding overlay form (first-time profile setup)
 */
router.post('/save', async (req, res) => {
  try {
    const { user_name, first_name, last_name, location, skills, github, linkedin, achievements } = req.body;
    if (!user_name) return res.status(400).json({ detail: 'user_name is required' });

    const user = await User.findOne({ user_name });
    if (!user) return res.status(404).json({ detail: 'User not found' });

    // Update all editable fields
    if (first_name)    user.first_name    = first_name;
    if (last_name)     user.last_name     = last_name;
    if (location)      user.location      = location;
    if (achievements)  user.achievements  = achievements;
    if (github)        user.github        = github;
    if (linkedin)      user.linkedin      = linkedin;
    if (skills && skills.length) user.skills = skills;
    user.has_onboarded = true;

    await user.save();

    res.json({
      success: true,
      message: 'Profile initialized successfully!',
      user: {
        user_name: user.user_name,
        first_name: user.first_name,
        last_name: user.last_name,
        location: user.location,
        achievements: user.achievements,
        github: user.github,
        linkedin: user.linkedin,
        skills: user.skills,
        has_onboarded: true
      }
    });
  } catch (error) {
    res.status(500).json({ detail: error.message });
  }
});

/**
 * ─── PROFILE UPDATE ENDPOINT ─────────────────────────────────────────
 * Called from the edit-profile form on the dashboard (POST /api/profile/update)
 */
router.post('/update', async (req, res) => {
  try {
    const { user_name, first_name, last_name, location, github, linkedin, achievements, skills } = req.body;
    if (!user_name) return res.status(400).json({ detail: 'user_name is required' });

    const user = await User.findOne({ user_name });
    if (!user) return res.status(404).json({ detail: 'User node not found in database.' });

    // Apply all supplied updates
    if (first_name !== undefined)   user.first_name   = first_name;
    if (last_name !== undefined)    user.last_name    = last_name;
    if (location !== undefined)     user.location     = location;
    if (achievements !== undefined) user.achievements = achievements;
    if (github !== undefined)       user.github       = github;
    if (linkedin !== undefined)     user.linkedin     = linkedin;
    if (skills && skills.length)    user.skills       = skills;

    await user.save();

    res.json({
      success: true,
      message: 'Profile updated successfully.',
      user: {
        user_name: user.user_name,
        first_name: user.first_name,
        last_name: user.last_name,
        location: user.location,
        achievements: user.achievements,
        github: user.github,
        linkedin: user.linkedin,
        skills: user.skills,
        has_onboarded: user.has_onboarded
      }
    });
  } catch (error) {
    res.status(500).json({ detail: error.message });
  }
});

module.exports = router;