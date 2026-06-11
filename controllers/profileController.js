const Profile = require('../models/Profile');

// Get profile by User ID
exports.getProfile = async (req, res) => {
  try {
    const profile = await Profile.findOne({ user: req.params.id }).populate('user', 'user_name');
    if (!profile) {
      return res.status(404).json({ message: 'Profile not found' });
    }
    res.status(200).json(profile);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// Create or Update Profile
exports.updateProfile = async (req, res) => {
  const { status, skills, projects, social } = req.body;
  try {
    let profile = await Profile.findOneAndUpdate(
      { user: req.params.id },
      { $set: { status, skills, projects, social } },
      { new: true, upsert: true }
    );
    res.status(200).json(profile);
  } catch (err) {
    res.status(500).json({ message: 'Update failed', error: err.message });
  }
};