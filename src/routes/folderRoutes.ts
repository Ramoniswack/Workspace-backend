const express = require("express");
const {
  createFolder,
  getFolders,
  updateFolder,
  deleteFolder
} = require("../controllers/folderController");
const { protect } = require("../middlewares/authMiddleware");
const { requirePermission } = require("../permissions/permission.middleware");
const { checkFolderLimit } = require("../middlewares/subscriptionMiddleware");

// Space-scoped router
const spaceFolderRouter = express.Router({ mergeParams: true });

// POST /api/spaces/:spaceId/folders - Create folder
// GET /api/spaces/:spaceId/folders - Get all folders in space
spaceFolderRouter.post("/", protect, requirePermission("CREATE_FOLDER"), checkFolderLimit, createFolder);
spaceFolderRouter.get("/", protect, requirePermission("VIEW_FOLDER"), getFolders);

// Standalone folder router
const folderRouter = express.Router();

// PUT /api/folders/:id - Update folder
// DELETE /api/folders/:id - Delete folder
folderRouter.put("/:id", protect, requirePermission("UPDATE_FOLDER"), updateFolder);
folderRouter.delete("/:id", protect, requirePermission("DELETE_FOLDER"), deleteFolder);

module.exports = { spaceFolderRouter, folderRouter };

export {};
