const express = require("express");
const router = express.Router();
const {
  createDependency,
  deleteDependency,
  getTaskDependencies,
  getBlockingTasks
} = require("../controllers/taskDependencyController");
const { protect } = require("../middlewares/authMiddleware");
const validate = require("../utils/validation");
const { createTaskDependencySchema } = require("../validators/taskDependencyValidators");

// All routes require authentication
router.use(protect);

// POST /api/task-dependencies - Create dependency
router.post("/", validate(createTaskDependencySchema), createDependency);

// DELETE /api/task-dependencies/:id - Delete dependency
router.delete("/:id", deleteDependency);

// GET /api/task-dependencies/task/:taskId - Get task dependencies
router.get("/task/:taskId", getTaskDependencies);

// GET /api/task-dependencies/task/:taskId/blocking - Get blocking tasks
router.get("/task/:taskId/blocking", getBlockingTasks);

module.exports = router;

export {};
