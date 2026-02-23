const express = require("express");
const router = express.Router();
const notificationCenterController = require("../controllers/notificationCenterController");
const notificationController = require("../controllers/notificationController");
const { protect } = require("../middlewares/authMiddleware");

// All routes require authentication
router.use(protect);

// POST /api/notifications/fcm-token - Register FCM token
router.post("/fcm-token", notificationController.registerFCMToken);

// GET /api/notifications - Get user notifications
router.get("/", notificationCenterController.getNotifications);

// GET /api/notifications/unread-count - Get unread count
router.get("/unread-count", notificationCenterController.getUnreadCount);

// PATCH /api/notifications/read-all - Mark all as read
router.patch("/read-all", notificationCenterController.markAllAsRead);

// PATCH /api/notifications/:id/read - Mark as read
router.patch("/:id/read", notificationCenterController.markAsRead);

module.exports = router;

export {};
