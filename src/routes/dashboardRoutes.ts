const express = require("express");
const {
  getTasksSummary,
  getWorkload,
  getStatusBreakdown
} = require("../controllers/dashboardController");
const { protect } = require("../middlewares/authMiddleware");

const dashboardRouter = express.Router();

// GET /api/dashboard/tasks/summary - Get tasks summary
// GET /api/dashboard/workload - Get workload
// GET /api/dashboard/status-breakdown - Get status breakdown
dashboardRouter.get("/tasks/summary", protect, getTasksSummary);
dashboardRouter.get("/workload", protect, getWorkload);
dashboardRouter.get("/status-breakdown", protect, getStatusBreakdown);

module.exports = dashboardRouter;

export {};
