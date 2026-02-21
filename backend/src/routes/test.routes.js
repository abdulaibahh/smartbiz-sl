const router = require("express").Router();

// Simple test route that doesn't use database
router.get("/test", (req, res) => {
  res.json({ status: "ok", message: "Test route works!" });
});

// Health check without database
router.get("/ping", (req, res) => {
  res.send("pong");
});

module.exports = router;
