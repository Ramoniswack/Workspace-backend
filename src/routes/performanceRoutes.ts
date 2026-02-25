const express = require("express");
const router = express.Router();
const performanceController = require("../controllers/performanceController");
const { protect } = require("../middlewares/authMiddleware");

// All routes require authentication
router.use(protect);

// Get current user's performance
router.get("/me/workspace/:workspaceId", performanceController.getMyPerformance);

// Get specific user's performance
router.get("/user/:userId/workspace/:workspaceId", performanceController.getUserPerformance);

// Get team performance
router.get("/team/workspace/:workspaceId", performanceController.getTeamPerformance);

// Get workspace performance summary
router.get("/workspace/:workspaceId/summary", performanceController.getWorkspacePerformanceSummary);

module.exports = router;
export {};
