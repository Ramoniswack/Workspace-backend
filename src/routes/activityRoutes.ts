const express = require("express");
const router = express.Router();
const activityController = require("../controllers/activityController");
const { protect } = require("../middlewares/authMiddleware");

/**
 * Activity Routes
 * Handles comments and activity tracking for tasks
 */

// General activity query route
router.get(
  "/activities",
  protect,
  activityController.getActivities
);

// Task-specific routes
router.post(
  "/tasks/:taskId/comments",
  protect,
  activityController.createComment
);

router.get(
  "/tasks/:taskId/activity",
  protect,
  activityController.getTaskActivity
);

// Activity-specific routes
router.put(
  "/activities/:activityId",
  protect,
  activityController.updateComment
);

router.delete(
  "/activities/:activityId",
  protect,
  activityController.deleteComment
);

router.post(
  "/activities/:activityId/reactions",
  protect,
  activityController.addReaction
);

router.delete(
  "/activities/:activityId/reactions",
  protect,
  activityController.removeReaction
);

// Workspace activity feed
router.get(
  "/workspaces/:workspaceId/activity",
  protect,
  activityController.getUserActivity
);

module.exports = router;

export {};
