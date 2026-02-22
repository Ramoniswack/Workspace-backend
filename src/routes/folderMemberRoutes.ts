const express = require("express");
const {
  getFolderMembers,
  addFolderMember,
  updateFolderMember,
  removeFolderMember,
} = require("../controllers/folderMemberController");
const { protect } = require("../middlewares/authMiddleware");
const { requirePermission } = require("../permissions/permission.middleware");

const router = express.Router({ mergeParams: true });

// GET /api/folders/:folderId/folder-members - Get all folder members with overrides
router.get("/", protect, requirePermission("VIEW_FOLDER"), getFolderMembers);

// POST /api/folders/:folderId/folder-members - Add/update folder member override
router.post("/", protect, requirePermission("MANAGE_SPACE_PERMISSIONS"), addFolderMember);

// PATCH /api/folders/:folderId/folder-members/:userId - Update folder member permission
router.patch("/:userId", protect, requirePermission("MANAGE_SPACE_PERMISSIONS"), updateFolderMember);

// DELETE /api/folders/:folderId/folder-members/:userId - Remove folder member override
router.delete("/:userId", protect, requirePermission("MANAGE_SPACE_PERMISSIONS"), removeFolderMember);

module.exports = router;

export {};
