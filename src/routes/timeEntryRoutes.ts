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
const {
  getWorkspaceActiveTimers,
  getTeamTimesheets,
  adminStopTimer,
  getWorkspaceTimeStats,
  cleanupOrphanedTimers,
  stopAllUserTimers
} = require("../controllers/adminTimeController");
const { protect } = require("../middlewares/authMiddleware");
const validate = require("../utils/validation");
const {
  startTimerSchema,
  addManualTimeSchema
} = require("../validators/timeEntryValidators");

// All routes require authentication
router.use(protect);

// ============================================
// ADMIN ROUTES (Workspace Admin/Owner only)
// ============================================
// Note: Permission checks are handled in the service layer

// GET /api/time/admin/workspace/:workspaceId/active - Get all active timers
router.get("/admin/workspace/:workspaceId/active", getWorkspaceActiveTimers);

// GET /api/time/admin/workspace/:workspaceId/timesheets - Get team timesheets
router.get("/admin/workspace/:workspaceId/timesheets", getTeamTimesheets);

// GET /api/time/admin/workspace/:workspaceId/stats - Get workspace time stats
router.get("/admin/workspace/:workspaceId/stats", getWorkspaceTimeStats);

// POST /api/time/admin/stop/:entryId - Admin force-stop timer
router.post("/admin/stop/:entryId", adminStopTimer);

// POST /api/time/admin/workspace/:workspaceId/cleanup-orphaned - Cleanup orphaned timers
router.post("/admin/workspace/:workspaceId/cleanup-orphaned", cleanupOrphanedTimers);

// POST /api/time/admin/workspace/:workspaceId/stop-user-timers/:userId - Stop all user timers
router.post("/admin/workspace/:workspaceId/stop-user-timers/:userId", stopAllUserTimers);

// ============================================
// USER ROUTES
// ============================================

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
