const express = require("express");
const rateLimit = require("express-rate-limit");
const {
  createWorkspace,
  getMyWorkspaces,
  getWorkspace,
  updateWorkspace,
  deleteWorkspace,
  getWorkspaceAnalytics,
  updateMemberCustomRole
} = require("../controllers/workspaceController");
const {
  getAnnouncements,
  createAnnouncement,
  deleteAnnouncement
} = require("../controllers/announcementController");
const { toggleWorkspaceClock } = require("../controllers/workspaceMemberController");
const { protect } = require("../middlewares/authMiddleware");
const { checkWorkspaceLimit } = require("../middlewares/subscriptionMiddleware");
const { requirePermission } = require("../permissions/permission.middleware");
const requireWorkspaceOwner = require("../middlewares/requireWorkspaceOwner");

const router = express.Router();

// Rate limiter for custom role updates (10 requests per minute)
const customRoleRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10,
  message: "Too many custom role updates, please try again later",
  standardHeaders: true,
  legacyHeaders: false
});

router.post("/", protect, checkWorkspaceLimit, createWorkspace);
router.get("/", protect, getMyWorkspaces);

router.get("/:id", protect, requirePermission("VIEW_WORKSPACE"), getWorkspace);
router.get("/:id/analytics", protect, requirePermission("VIEW_WORKSPACE"), getWorkspaceAnalytics);
router.get("/:id/announcements", protect, requirePermission("VIEW_WORKSPACE"), getAnnouncements);
router.post("/:id/announcements", protect, requirePermission("VIEW_WORKSPACE"), createAnnouncement);
router.delete("/:id/announcements/:announcementId", protect, requirePermission("VIEW_WORKSPACE"), deleteAnnouncement);
router.post("/:workspaceId/clock/toggle", protect, requirePermission("VIEW_WORKSPACE"), toggleWorkspaceClock);
router.put("/:id", protect, requirePermission("UPDATE_WORKSPACE"), updateWorkspace);
router.delete("/:id", protect, requirePermission("DELETE_WORKSPACE"), deleteWorkspace);

// Custom role management endpoint
router.patch(
  "/:workspaceId/members/:memberId/custom-role",
  protect,
  requireWorkspaceOwner,
  customRoleRateLimiter,
  updateMemberCustomRole
);

module.exports = router;

export {};
