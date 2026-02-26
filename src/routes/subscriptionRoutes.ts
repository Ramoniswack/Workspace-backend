const express = require("express");
const { getSubscriptionInfo } = require("../middlewares/subscriptionMiddleware");
const { protect } = require("../middlewares/authMiddleware");

const router = express.Router();

// Get current user's subscription info
router.get("/info", protect, getSubscriptionInfo);

module.exports = router;

export {};
