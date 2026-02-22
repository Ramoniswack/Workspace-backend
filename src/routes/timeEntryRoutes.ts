const express = require("express");
const router = express.Router();
const {
  startTimer,
  stopTimer,
  addManualTime,
  getTaskTimeSummary,
  getProjectTimeSummary,
  getRunningTimer,
  deleteTimeEntry
} = require("../controllers/timeEntryController");
const { protect } = require("../middlewares/authMiddleware");
const validate = require("../utils/validation");
const {
  startTimerSchema,
  addManualTimeSchema
} = require("../validators/timeEntryValidators");

// All routes require authentication
router.use(protect);

// POST /api/time/start/:taskId - Start timer
router.post("/start/:taskId", validate(startTimerSchema), startTimer);

// POST /api/time/stop/:entryId - Stop timer
router.post("/stop/:entryId", stopTimer);

// POST /api/time/manual - Add manual time entry
router.post("/manual", validate(addManualTimeSchema), addManualTime);

// GET /api/time/running - Get user's running timer
router.get("/running", getRunningTimer);

// GET /api/time/task/:taskId - Get task time summary
router.get("/task/:taskId", getTaskTimeSummary);

// GET /api/time/project/:projectId - Get project time summary
router.get("/project/:projectId", getProjectTimeSummary);

// DELETE /api/time/:entryId - Delete time entry
router.delete("/:entryId", deleteTimeEntry);

module.exports = router;

export {};
