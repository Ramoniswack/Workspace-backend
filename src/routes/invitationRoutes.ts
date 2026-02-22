const express = require("express");
const {
  sendInvite,
  acceptInvite,
  getWorkspaceInvitations,
  cancelInvitation,
  getMyInvitations,
  verifyInvitation
} = require("../controllers/invitationController");
const { protect } = require("../middlewares/authMiddleware");
const { requirePermission } = require("../permissions/permission.middleware");
const validate = require("../utils/validation");
const { sendInviteSchema } = require("../validators/invitationValidators");

const router = express.Router({ mergeParams: true });

// Workspace-scoped invitation routes
// POST /api/workspaces/:workspaceId/invites - Send invitation (admin/owner only)
// GET /api/workspaces/:workspaceId/invites - List invitations (admin/owner only)
router.post("/", protect, requirePermission("INVITE_MEMBER"), validate(sendInviteSchema), sendInvite);
router.get("/", protect, requirePermission("INVITE_MEMBER"), getWorkspaceInvitations);

// DELETE /api/workspaces/:workspaceId/invites/:invitationId - Cancel invitation
router.delete("/:invitationId", protect, requirePermission("INVITE_MEMBER"), cancelInvitation);

// Standalone invitation routes
const inviteRouter = express.Router();

// POST /api/invites/accept/:token - Accept invitation
inviteRouter.post("/accept/:token", protect, acceptInvite);

// GET /api/invites/my-invitations - Get user's pending invitations
inviteRouter.get("/my-invitations", protect, getMyInvitations);

// Public routes (no authentication required)
const publicInviteRouter = express.Router();

// GET /api/invites/verify/:token - Verify invitation token (public)
publicInviteRouter.get("/verify/:token", verifyInvitation);

module.exports = { workspaceInvitationRouter: router, inviteRouter, publicInviteRouter };

export {};
