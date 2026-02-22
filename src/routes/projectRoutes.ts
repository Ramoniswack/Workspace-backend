const express = require("express");
const {
  createProject,
  getProjects,
  getProject,
  updateProject,
  deleteProject
} = require("../controllers/projectController");
const { protect } = require("../middlewares/authMiddleware");
const { requirePermission } = require("../permissions/permission.middleware");

const router = express.Router({ mergeParams: true });

// Workspace-scoped routes
// POST /api/workspaces/:workspaceId/projects - Create project
// GET /api/workspaces/:workspaceId/projects - Get all projects
router.post("/", protect, requirePermission("VIEW_WORKSPACE"), createProject);
router.get("/", protect, requirePermission("VIEW_WORKSPACE"), getProjects);

// Project-specific routes (standalone)
const projectRouter = express.Router();

projectRouter.get("/:id", protect, getProject);
projectRouter.patch("/:id", protect, updateProject);
projectRouter.delete("/:id", protect, deleteProject);

module.exports = { workspaceProjectRouter: router, projectRouter };

export {};
