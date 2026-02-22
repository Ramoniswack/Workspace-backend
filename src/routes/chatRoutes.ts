const express = require("express");
const router = express.Router();
const chatController = require("../controllers/chatController");
const { protect } = require("../middlewares/authMiddleware");
const validate = require("../utils/validation");
const { sendMessageSchema } = require("../validators/chatValidators");

// Workspace chat routes
const workspaceChatRouter = express.Router({ mergeParams: true });

workspaceChatRouter
  .route("/")
  .post(protect, validate(sendMessageSchema), chatController.sendMessage)
  .get(protect, chatController.getMessages);

// Individual message routes
const chatRouter = express.Router();

chatRouter.route("/:id").delete(protect, chatController.deleteMessage);

module.exports = {
  workspaceChatRouter,
  chatRouter,
};

export {};
