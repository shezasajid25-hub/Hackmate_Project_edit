const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const Admin = require('../models/Admin');
const Hackathon = require('../models/Hackathon');

// ─── ADMIN REGISTER/SIGNUP ALIAS MATRIX ───
// Added an identical endpoint mapping for '/signup' to catch discrepancies
const registerHandler = async (req, res) => {
    try {
        // Read either snake_case (spec) or camelCase (common inputs)
        const full_name = req.body.full_name || req.body.name;
        const organization_name = req.body.organization_name || req.body.orgName;
        const email = req.body.email;
        const password = req.body.password;

        if (!full_name || !organization_name || !email || !password) {
            return res.status(400).json({ detail: "All fields are mandatory (*)" });
        }

        const existingAdmin = await Admin.findOne({ email: email.toLowerCase() });
        if (existingAdmin) {
            return res.status(400).json({ detail: "An organizer with this email already exists." });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const newAdmin = new Admin({
            full_name,
            organization_name,
            email: email.toLowerCase(),
            password: hashedPassword
        });

        await newAdmin.save();

        res.status(201).json({
            success: true,
            message: "Organizer node deployed cleanly!",
            admin: {
                id: newAdmin._id,
                full_name: newAdmin.full_name,
                organization_name: newAdmin.organization_name,
                email: newAdmin.email
            }
        });
    } catch (error) {
        console.error("ADMIN REGISTRATION BREAKDOWN:", error);
        res.status(500).json({ detail: error.message });
    }
};

// Map both paths to ensure total resilience against front-end call configurations
router.post('/register', registerHandler);
router.post('/signup', registerHandler);

// ─── ADMIN AUTHENTICATION AIRLOCK ───
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ detail: "Email and password are required." });
        }

        const admin = await Admin.findOne({ email: email.toLowerCase() });
        if (!admin) {
            return res.status(401).json({ detail: "Invalid administrative credentials." });
        }

        const isMatch = await bcrypt.compare(password, admin.password);
        if (!isMatch) {
            return res.status(401).json({ detail: "Invalid administrative credentials." });
        }

        res.json({
            success: true,
            message: "Mission Control Initialized.",
            admin: {
                id: admin._id,
                full_name: admin.full_name,
                organization_name: admin.organization_name,
                email: admin.email
            }
        });
    } catch (error) {
        res.status(500).json({ detail: error.message });
    }
});

// ─── GET ADMIN SPECIFIC MISSIONS ───
router.get('/missions/:adminId', async (req, res) => {
    try {
        const hackathons = await Hackathon.find({ organizer: req.params.adminId });
        res.json(hackathons);
    } catch (error) {
        res.status(500).json({ detail: error.message });
    }
});

// ─── EXPOSE UNIFIED DISCOVERY FEED (P0 FIX) ───
// This route satisfies the feed required by events.html
router.get('/missions/all', async (req, res) => {
    try {
        const publicMissions = await Hackathon.find({ status: 'PUBLISHED' });
        res.json(publicMissions);
    } catch (error) {
        res.status(500).json({ detail: error.message });
    }
});

// ─── GLOBAL MISSION DEPLOYMENT TRIGGER ───
router.post('/deploy-mission', async (req, res) => {
    try {
        const { title, description, target_date, tracks, is_paid, entry_fee, location_name, registration_link, organizer, poster } = req.body;

        if (!title || !description || !target_date || !location_name || !registration_link || !organizer) {
            return res.status(400).json({ detail: "Missing required deployment matrix parameters." });
        }

        const newHackathon = new Hackathon({
            title,
            description,
            target_date,
            tracks: tracks || [],
            is_paid: !!is_paid,
            entry_fee: is_paid ? entry_fee : 0,
            location_name,
            registration_link,
            organizer,
            poster: poster || "",
            status: 'PUBLISHED'
        });

        await newHackathon.save();
        res.status(201).json(newHackathon);
    } catch (error) {
        res.status(500).json({ detail: error.message });
    }
});

module.exports = router;