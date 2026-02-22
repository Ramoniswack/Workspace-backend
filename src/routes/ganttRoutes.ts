const express = require("express");
const ganttController = require("../controllers/ganttController");
const { protect } = require("../middlewares/authMiddleware");

const router = express.Router();

// All routes require authentication
router.use(protect);

// Update task timeline and cascade to dependents
router.post("/tasks/:taskId/update-timeline", ganttController.updateTaskTimeline);

// Get Gantt chart data for a space
router.get("/spaces/:spaceId", ganttController.getGanttData);

// Validate task timeline constraints
router.get("/tasks/:taskId/validate", ganttController.validateTimeline);

// Toggle milestone status
router.post("/tasks/:taskId/toggle-milestone", ganttController.toggleMilestone);

module.exports = router;

export {};
