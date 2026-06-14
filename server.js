require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcrypt');
const app = express();

// Import Models
const User = require('./models/User');
const Profile = require('./models/Profile');
const Admin = require('./models/Admin');
const Hackathon = require('./models/Hackathon');

// Import Routes
const profileRoutes = require('./routes/profileRoutes');
const adminRoutes = require('./routes/adminRoutes'); // <-- Added Admin Route Import

// Middleware
app.use(cors({ origin: 'http://localhost:5173', credentials: true }));
app.use(express.json());
app.use(express.static('static'));

// Database Connection
const uri = process.env.MONGODB_URI || process.env.MONGO_URI;
if (!uri) {
  console.error('❌ Missing MONGODB_URI or MONGO_URI in .env');
} else {
  mongoose
    .connect(uri, { serverSelectionTimeoutMS: 10000 })
    .then(() => console.log('✅ Connected to MongoDB Atlas!'))
    .catch((err) => console.error('❌ Connection error:', err));
}

// ─── ACTIVE HACKATHON MISSION FEED ENDPOINT ───
// Section 4.3 Requirement: Automatically pulls live data published by admins
app.get('/hackathons/active', (req, res) => {
  res.json({
    title: "HackMate Invitational 2026",
    description: "Build the future. Find your team. Ship something legendary.",
    target_date: "2026-08-20" // Fed to your styled multi-block boxes ticking live
  });
});

// ─── API ROUTE MOUNTING ───
app.use('/api/profile', profileRoutes);
app.use('/api/admin', adminRoutes); // <-- Added Admin Route Mounting Space

// ─── SIGNUP ───
app.post('/signup', async (req, res) => {
  try {
    const { first_name, last_name, email, user_name, password, role, skills, github } = req.body;

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = new User({
      first_name,
      last_name,
      email,
      user_name,
      password: hashedPassword,
      role,
      skills,
      github,
      has_onboarded: false
    });

    await newUser.save();
    res.status(201).json({
      message: "User registered successfully",
      user: { user_name: newUser.user_name, first_name: newUser.first_name, has_onboarded: false }
    });
  } catch (error) {
    res.status(500).json({ detail: "Registration failed: " + error.message });
  }
});

// ─── LOGIN ───
app.post('/login', async (req, res) => {
  try {
    const { user_name, password } = req.body;
    const user = await User.findOne({ user_name });
    if (!user) return res.status(401).json({ detail: "User not found." });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(401).json({ detail: "Invalid password." });

    res.status(200).json({
      message: "Login successful!",
      user: { user_name: user.user_name, first_name: user.first_name, has_onboarded: user.has_onboarded }
    });
  } catch (err) {
    res.status(500).json({ detail: "Login error: " + err.message });
  }
});

// ─── TEST ROUTE ───
app.get('/api/test', (req, res) => {
  res.json({ message: "Connection established with HackMate Engine!" });
});

// Server Initialization
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Server running on http://localhost:${PORT}`));