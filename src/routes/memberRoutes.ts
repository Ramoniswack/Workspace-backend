const express = require("express");
const {
  getWorkspaceMembers,
  updateMemberRole,
  removeMember,
  inviteMember,
  updateMyStatus,
} = require("../controllers/memberController");
const { protect } = require("../middlewares/authMiddleware");
const { requirePermission } = require("../permissions/permission.middleware");

const router = express.Router({ mergeParams: true });

// GET /api/workspaces/:workspaceId/members - Get all members (any member)
router.get("/", protect, requirePermission("VIEW_WORKSPACE"), getWorkspaceMembers);

// POST /api/workspaces/:workspaceId/members/invite - Invite member (admin or owner)
router.post("/invite", protect, requirePermission("INVITE_MEMBER"), inviteMember);

// PATCH /api/workspaces/:workspaceId/members/me/status - Update own status (any member)
router.patch("/me/status", protect, requirePermission("VIEW_WORKSPACE"), updateMyStatus);

// PATCH /api/workspaces/:workspaceId/members/:userId - Update member role (owner only)
router.patch("/:userId", protect, requirePermission("CHANGE_MEMBER_ROLE"), updateMemberRole);

// DELETE /api/workspaces/:workspaceId/members/:userId - Remove member (admin or owner)
router.delete("/:userId", protect, requirePermission("REMOVE_MEMBER"), removeMember);

module.exports = router;

export {};
