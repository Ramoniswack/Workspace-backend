const express = require("express");
const {
  createWorkspace,
  getMyWorkspaces,
  getWorkspace,
  updateWorkspace,
  deleteWorkspace,
  getWorkspaceAnalytics
} = require("../controllers/workspaceController");
const { protect } = require("../middlewares/authMiddleware");
const { requirePermission } = require("../permissions/permission.middleware");

const router = express.Router();

// POST /api/workspaces - Create workspace (any authenticated user)
// GET /api/workspaces - Get all user workspaces (any authenticated user)
router.post("/", protect, createWorkspace);
router.get("/", protect, getMyWorkspaces);

// GET /api/workspaces/:id - Get single workspace (must be member)
// PUT /api/workspaces/:id - Update workspace (admin or owner)
// DELETE /api/workspaces/:id - Delete workspace (owner only)
// GET /api/workspaces/:id/analytics - Get workspace analytics (must be member)
router.get("/:id", protect, requirePermission("VIEW_WORKSPACE"), getWorkspace);
router.get("/:id/analytics", protect, requirePermission("VIEW_WORKSPACE"), getWorkspaceAnalytics);
router.put("/:id", protect, requirePermission("UPDATE_WORKSPACE"), updateWorkspace);
router.delete("/:id", protect, requirePermission("DELETE_WORKSPACE"), deleteWorkspace);

module.exports = router;

export {};
