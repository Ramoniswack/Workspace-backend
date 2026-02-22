const express = require("express");
const commentController = require("../controllers/commentController");
const { protect } = require("../middlewares/authMiddleware");
const validate = require("../utils/validation");
const {
  createCommentSchema,
  editCommentSchema,
} = require("../validators/commentValidators");

// Task-scoped comment routes
// POST /api/tasks/:taskId/comments - Create comment
// GET /api/tasks/:taskId/comments - Get task comments
const taskCommentRouter = express.Router({ mergeParams: true });

taskCommentRouter.use(protect);

taskCommentRouter.post(
  "/",
  validate(createCommentSchema),
  commentController.createComment
);

taskCommentRouter.get("/", commentController.getTaskComments);

// Standalone comment routes
// GET /api/comments/:commentId - Get single comment
// PATCH /api/comments/:commentId - Edit comment
// DELETE /api/comments/:commentId - Delete comment
const commentRouter = express.Router();

commentRouter.use(protect);

commentRouter.get("/:commentId", commentController.getComment);

commentRouter.patch(
  "/:commentId",
  validate(editCommentSchema),
  commentController.editComment
);

commentRouter.delete("/:commentId", commentController.deleteComment);

module.exports = { taskCommentRouter, commentRouter };

export {};
