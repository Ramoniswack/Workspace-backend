const express = require("express");
const router = express.Router();
const directMessageController = require("../controllers/directMessageController");
const { protect } = require("../middlewares/authMiddleware");
const validate = require("../utils/validation");
const { sendMessageSchema } = require("../validators/directMessageValidators");

// All routes require authentication
router.use(protect);

// GET /api/dm - Get all conversations
router.get("/", directMessageController.getConversations);

// POST /api/dm/:userId - Start conversation with user
router.post("/:userId", directMessageController.startConversation);

// POST /api/dm/:userId/message - Send message to user
router.post(
  "/:userId/message",
  validate(sendMessageSchema),
  directMessageController.sendMessage
);

// GET /api/dm/:conversationId - Get single conversation
router.get("/:conversationId", directMessageController.getConversation);

// GET /api/dm/:conversationId/messages - Get messages in conversation
router.get("/:conversationId/messages", directMessageController.getMessages);

// PATCH /api/dm/:conversationId/read - Mark conversation as read
router.patch("/:conversationId/read", directMessageController.markAsRead);

module.exports = router;

export {};
