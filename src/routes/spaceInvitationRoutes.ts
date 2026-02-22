const express = require("express");
const {
  sendSpaceInvitation,
  getSpaceInvitations,
  acceptSpaceInvitation,
  declineSpaceInvitation,
  cancelSpaceInvitation,
  getMySpaceInvitations
} = require("../controllers/spaceInvitationController");
const { protect } = require("../middlewares/authMiddleware");
const { requirePermission } = require("../permissions/permission.middleware");

// Space-scoped routes (requires spaceId)
const spaceInvitationRouter = express.Router({ mergeParams: true });

// POST /api/spaces/:spaceId/invitations - Send space invitation
spaceInvitationRouter.post("/", protect, requirePermission("MANAGE_SPACE_PERMISSIONS"), sendSpaceInvitation);

// GET /api/spaces/:spaceId/invitations - Get all space invitations
spaceInvitationRouter.get("/", protect, requirePermission("MANAGE_SPACE_PERMISSIONS"), getSpaceInvitations);

// DELETE /api/spaces/:spaceId/invitations/:invitationId - Cancel invitation
spaceInvitationRouter.delete("/:invitationId", protect, requirePermission("MANAGE_SPACE_PERMISSIONS"), cancelSpaceInvitation);

// Standalone routes (no spaceId required)
const invitationRouter = express.Router();

// POST /api/space-invitations/accept/:token - Accept invitation
invitationRouter.post("/accept/:token", protect, acceptSpaceInvitation);

// POST /api/space-invitations/decline/:token - Decline invitation
invitationRouter.post("/decline/:token", protect, declineSpaceInvitation);

// GET /api/space-invitations/my-invitations - Get my pending invitations
invitationRouter.get("/my-invitations", protect, getMySpaceInvitations);

module.exports = { spaceInvitationRouter, invitationRouter };

export {};
