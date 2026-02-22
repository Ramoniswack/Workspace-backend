const express = require("express");
const {
  createSpace,
  getWorkspaceSpaces,
  getSpace,
  updateSpace,
  deleteSpace,
  addMemberToSpace,
  removeMemberFromSpace,
  inviteExternalUsers
} = require("../controllers/spaceController");
const { protect } = require("../middlewares/authMiddleware");
const { requirePermission } = require("../permissions/permission.middleware");
const validate = require("../utils/validation");
const { createSpaceSchema, updateSpaceSchema } = require("../validators/spaceValidators");

// Workspace-scoped router
const workspaceSpaceRouter = express.Router({ mergeParams: true });

// POST /api/workspaces/:workspaceId/spaces - Create space (admin or owner)
// GET /api/workspaces/:workspaceId/spaces - Get all spaces (any member)
workspaceSpaceRouter.post("/", protect, requirePermission("CREATE_SPACE"), validate(createSpaceSchema), createSpace);
workspaceSpaceRouter.get("/", protect, requirePermission("VIEW_SPACE"), getWorkspaceSpaces);

// Standalone space router
const spaceRouter = express.Router();

// GET /api/spaces/:id - Get single space (any member)
// PATCH /api/spaces/:id - Update space (member or higher)
// DELETE /api/spaces/:id - Delete space (admin or owner)
spaceRouter.get("/:id", protect, requirePermission("VIEW_SPACE"), getSpace);
spaceRouter.patch("/:id", protect, requirePermission("UPDATE_SPACE"), validate(updateSpaceSchema), updateSpace);
spaceRouter.delete("/:id", protect, requirePermission("DELETE_SPACE"), deleteSpace);

// POST /api/spaces/:id/members - Add member to space (admin or owner)
// DELETE /api/spaces/:id/members/:userId - Remove member from space (admin or owner)
// POST /api/spaces/:id/invite-external - Invite external users (admin or owner)
spaceRouter.post("/:id/members", protect, requirePermission("ADD_SPACE_MEMBER"), addMemberToSpace);
spaceRouter.delete("/:id/members/:userId", protect, requirePermission("REMOVE_SPACE_MEMBER"), removeMemberFromSpace);
spaceRouter.post("/:id/invite-external", protect, requirePermission("INVITE_MEMBER"), inviteExternalUsers);

module.exports = { workspaceSpaceRouter, spaceRouter };

export {};
