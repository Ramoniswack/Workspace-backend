const express = require("express");
const {
  createWorkspace,
  getMyWorkspaces,
  getWorkspace,
  updateWorkspace,
  deleteWorkspace,
  getWorkspaceAnalytics
} = require("../controllers/workspaceController");
const {
  getAnnouncements,
  createAnnouncement,
  deleteAnnouncement
} = require("../controllers/announcementController");
const { toggleWorkspaceClock } = require("../controllers/workspaceMemberController");
const { protect } = require("../middlewares/authMiddleware");
const { requirePermission } = require("../permissions/permission.middleware");

const router = express.Router();

router.post("/", protect, createWorkspace);
router.get("/", protect, getMyWorkspaces);

router.get("/:id", protect, requirePermission("VIEW_WORKSPACE"), getWorkspace);
router.get("/:id/analytics", protect, requirePermission("VIEW_WORKSPACE"), getWorkspaceAnalytics);
router.get("/:id/announcements", protect, requirePermission("VIEW_WORKSPACE"), getAnnouncements);
router.post("/:id/announcements", protect, requirePermission("VIEW_WORKSPACE"), createAnnouncement);
router.delete("/:id/announcements/:announcementId", protect, requirePermission("VIEW_WORKSPACE"), deleteAnnouncement);
router.post("/:workspaceId/clock/toggle", protect, requirePermission("VIEW_WORKSPACE"), toggleWorkspaceClock);
router.put("/:id", protect, requirePermission("UPDATE_WORKSPACE"), updateWorkspace);
router.delete("/:id", protect, requirePermission("DELETE_WORKSPACE"), deleteWorkspace);

module.exports = router;

export {};
