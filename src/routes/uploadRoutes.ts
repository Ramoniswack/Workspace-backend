const express = require("express");
const router = express.Router();
const uploadController = require("../controllers/uploadController");
const { protect } = require("../middlewares/authMiddleware");
const { uploadSingle, handleUploadError } = require("../middlewares/uploadMiddleware");

/**
 * Upload Routes
 * All routes require authentication
 */

// Task attachments
router.post(
  "/tasks/:taskId/attachments",
  protect,
  uploadSingle,
  handleUploadError,
  uploadController.uploadTaskAttachment
);

router.get(
  "/tasks/:taskId/attachments",
  protect,
  uploadController.getTaskAttachments
);

// Comment attachments
router.post(
  "/comments/:commentId/attachments",
  protect,
  uploadSingle,
  handleUploadError,
  uploadController.uploadCommentAttachment
);

router.get(
  "/comments/:commentId/attachments",
  protect,
  uploadController.getCommentAttachments
);

// Direct message attachments
router.post(
  "/dm/:conversationId/attachments",
  protect,
  uploadSingle,
  handleUploadError,
  uploadController.uploadDMAttachment
);

router.get(
  "/dm/:conversationId/attachments",
  protect,
  uploadController.getConversationAttachments
);

// Delete attachment
router.delete(
  "/attachments/:attachmentId",
  protect,
  uploadController.deleteAttachment
);

module.exports = router;

export {};
