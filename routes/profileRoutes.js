const express = require('express');
const router = express.Router();

// Define a test route to verify the file works
router.get('/', (req, res) => {
  res.json({ message: "Profile routes are active" });
});

// IMPORTANT: This line exports the router so server.js can see it
module.exports = router;