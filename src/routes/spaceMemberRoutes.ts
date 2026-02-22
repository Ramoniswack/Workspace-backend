const express = require("express");
const {
  getSpaceMembers,
  addSpaceMember,
  updateSpaceMember,
  removeSpaceMember,
} = require("../controllers/spaceMemberController");
const { protect } = require("../middlewares/authMiddleware");
const { requirePermission } = require("../permissions/permission.middleware");

const router = express.Router({ mergeParams: true });

// GET /api/spaces/:spaceId/space-members - Get all space members with overrides
router.get("/", protect, requirePermission("VIEW_SPACE"), getSpaceMembers);

// POST /api/spaces/:spaceId/space-members - Add/update space member override
router.post("/", protect, requirePermission("MANAGE_SPACE_PERMISSIONS"), addSpaceMember);

// PATCH /api/spaces/:spaceId/space-members/:userId - Update space member permission
router.patch("/:userId", protect, requirePermission("MANAGE_SPACE_PERMISSIONS"), updateSpaceMember);

// DELETE /api/spaces/:spaceId/space-members/:userId - Remove space member override
router.delete("/:userId", protect, requirePermission("MANAGE_SPACE_PERMISSIONS"), removeSpaceMember);

module.exports = router;

export {};
