require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcrypt');
const app = express();

// Import Unified Database Schemas
const User = require('./models/User');
const Profile = require('./models/Profile');
const Admin = require('./models/Admin');
const Hackathon = require('./models/Hackathon');

// Import Custom Route Routers
const profileRoutes = require('./routes/profileRoutes');
const adminRoutes = require('./routes/adminRoutes');

// ─── BUG FIX #4: RECALIBRATE CORS DOMAIN AIRLOCKS ───
// Shifted from port 5173 to port 3000 to eliminate cross-origin browser validation rejections
app.use(cors({
  origin: ['http://localhost:3000', 'http://127.0.0.1:3000'],
  credentials: true
}));

app.use(express.json());
app.use(express.static('static'));

// MongoDB Pipeline Connection Instantiation
const uri = process.env.MONGODB_URI || process.env.MONGO_URI || 'mongodb://localhost:27017/hackmate';
mongoose
  .connect(uri, { serverSelectionTimeoutMS: 10000 })
  .then(() => console.log('✅ Connected to MongoDB Backend Database Core Cluster!'))
  .catch((err) => console.error('❌ Database Connection Aborted:', err));

// ─── BUG FIX #7: DYNAMIC LIVE ACTIVE MISSION COUNTDOWN FEED ───
// Replaced hardcoded static copy with live database fallback tracking
app.get('/hackathons/active', async (req, res) => {
  try {
    const latestActiveMission = await Hackathon.findOne({ status: 'PUBLISHED' }).sort({ createdAt: -1 });
    if (latestActiveMission) {
      return res.json({
        title: latestActiveMission.title,
        description: latestActiveMission.description,
        target_date: latestActiveMission.target_date
      });
    }
    // Safe architectural structural fallback if zero admin entries exist yet
    res.json({
      title: "HackMate Invitational 2026",
      description: "Build the future. Find your team. Ship something legendary.",
      target_date: "2026-08-20"
    });
  } catch (error) {
    res.status(500).json({ detail: "Database readout pipeline crash: " + error.message });
  }
});

// ─── BUG FIX #2: DYNAMIC SYNC ENDPOINT FOR GUEST VIEW BOARDS ───
app.get('/api/admin/missions/all', async (req, res) => {
  try {
    const publishedHackathons = await Hackathon.find({ status: 'PUBLISHED' }).sort({ createdAt: -1 });
    res.json(publishedHackathons);
  } catch (error) {
    res.status(500).json({ detail: "Failed aggregating public boards: " + error.message });
  }
});

// Mount Platform Route Matrices
app.use('/api/profile', profileRoutes);
app.use('/api/admin', adminRoutes);
// ─── USER EVENT REGISTRATION PIPELINE (UPDATED PREFIX) ───

// 1. Endpoint to handle a student clicking "[ Register ]" on an event
app.post('/api/hacker/register-event', async (req, res) => {
  try {
    const { username, hackathonId } = req.body;

    if (!username || !hackathonId) {
      return res.status(400).json({ detail: "Missing registration context parameters." });
    }

    // Find the user attempting to register
    const user = await User.findOne({ user_name: username });
    if (!user) return res.status(404).json({ detail: "Hacker context node not found." });

    // Prevent duplicate entries in their registration matrix array
    if (!user.registered_hackathons) {
      user.registered_hackathons = [];
    }

    if (user.registered_hackathons.includes(hackathonId)) {
      return res.status(400).json({ detail: "Hacker node already locked into this mission matrix." });
    }

    // Push the hackathon ID directly into the user document's tracker array
    user.registered_hackathons.push(hackathonId);

    // Mark modified manually so mongoose handles mixed/untyped arrays if necessary
    user.markModified('registered_hackathons');
    await user.save();

    res.status(200).json({ success: true, message: "Hacker successfully registered to mission core!" });
  } catch (error) {
    res.status(500).json({ detail: "Failed executing event registration connection: " + error.message });
  }
});

// 2. Endpoint that index.html queries to populate the State Engine views
app.get('/api/hacker/my-registrations', async (req, res) => {
  try {
    const { username } = req.query;

    if (!username) {
      return res.status(400).json({ detail: "Username query parameter required." });
    }

    const user = await User.findOne({ user_name: username });
    if (!user) return res.status(404).json({ detail: "User handle context not found." });

    // If they have zero registrations recorded, return an empty array instantly
    if (!user.registered_hackathons || user.registered_hackathons.length === 0) {
      return res.json([]);
    }

    // Look up the actual details for every hackathon ID saved in the user's document
    const registeredMissions = await Hackathon.find({
      _id: { $in: user.registered_hackathons }
    }).sort({ createdAt: -1 });

    res.json(registeredMissions);
  } catch (error) {
    res.status(500).json({ detail: "Error fetching personal registration nodes: " + error.message });
  }
});
// ─── STANDARD RECOVERY PATHWAYS (SIGNUP / LOGIN) ───
app.post('/signup', async (req, res) => {
  try {
    const { first_name, last_name, email, user_name, password, role, skills, github, linkedin_url } = req.body;
    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = new User({
      first_name, last_name, email, user_name, password: hashedPassword, role, skills, github, linkedin_url, has_onboarded: false
    });
    await newUser.save();
    res.status(201).json({
      message: "User registered successfully",
      user: { user_name: newUser.user_name, first_name: newUser.first_name, has_onboarded: false }
    });
  } catch (error) {
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern)[0];
      return res.status(409).json({ detail: `An account with that ${field === 'email' ? 'email' : 'username'} already exists.` });
    }
    res.status(500).json({ detail: "Registration sequence failure: " + error.message });
  }
});

app.post('/login', async (req, res) => {
  try {
    const { user_name, password } = req.body;
    // The frontend sends the input as `user_name`, but it could be an email or a username
    const user = await User.findOne({
      $or: [
        { user_name: user_name },
        { email: user_name }
      ]
    });
    if (!user) return res.status(401).json({ detail: "User handle context not found." });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(401).json({ detail: "Invalid access token credentials." });

    res.status(200).json({
      message: "Login successful!",
      user: { user_name: user.user_name, first_name: user.first_name, has_onboarded: user.has_onboarded }
    });
  } catch (err) {
    res.status(500).json({ detail: "Login transaction failure: " + err.message });
  }
});

// Engine Startup Channel Access Hook
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 HackMate Engine Operational On Network Node Address: http://localhost:${PORT}`));