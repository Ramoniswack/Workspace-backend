const express = require("express");
const {
  getListMembers,
  addListMember,
  updateListMember,
  removeListMember,
} = require("../controllers/listMemberController");
const { protect } = require("../middlewares/authMiddleware");
const { requirePermission } = require("../permissions/permission.middleware");

const router = express.Router({ mergeParams: true });

// GET /api/lists/:listId/list-members - Get all list members with overrides
router.get("/", protect, requirePermission("VIEW_LIST"), getListMembers);

// POST /api/lists/:listId/list-members - Add/update list member override
router.post("/", protect, requirePermission("MANAGE_SPACE_PERMISSIONS"), addListMember);

// PATCH /api/lists/:listId/list-members/:userId - Update list member permission
router.patch("/:userId", protect, requirePermission("MANAGE_SPACE_PERMISSIONS"), updateListMember);

// DELETE /api/lists/:listId/list-members/:userId - Remove list member override
router.delete("/:userId", protect, requirePermission("MANAGE_SPACE_PERMISSIONS"), removeListMember);

module.exports = router;

export {};
