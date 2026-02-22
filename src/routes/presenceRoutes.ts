const express = require("express");
const router = express.Router();
const presenceController = require("../controllers/presenceController");
const { protect } = require("../middlewares/authMiddleware");

/**
 * Presence Routes
 * All routes require authentication
 */

// Get workspace presence (all members online/offline status)
router.get(
  "/:workspaceId",
  protect,
  presenceController.getWorkspacePresence
);

// Get online users in workspace
router.get(
  "/:workspaceId/online",
  protect,
  presenceController.getOnlineUsers
);

// Get specific user presence status
router.get(
  "/user/:userId",
  protect,
  presenceController.getUserPresence
);

module.exports = router;

export {};
