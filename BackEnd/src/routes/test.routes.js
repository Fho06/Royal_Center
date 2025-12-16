const express = require("express");
const { requireAuth, requireAdmin } = require("../middleware/auth.middleware");

const router = express.Router();

// Any logged-in user
router.get("/me", requireAuth, (req, res) => {
  res.json({
    message: "You are authenticated",
    user: req.user
  });
});

// Admin-only route
router.get("/admin", requireAuth, requireAdmin, (req, res) => {
  res.json({
    message: "Welcome, admin"
  });
});

module.exports = router;
