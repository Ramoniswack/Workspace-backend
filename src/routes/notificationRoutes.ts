const express = require("express");
const router = express.Router();
const notificationController = require("../controllers/notificationController");
const { protect } = require("../middlewares/authMiddleware");
const validate = require("../utils/validation");
const {
  registerDeviceSchema,
  unregisterDeviceSchema,
} = require("../validators/notificationValidators");

// All routes require authentication
router.use(protect);

// Register device for push notifications
router.post(
  "/register",
  validate(registerDeviceSchema),
  notificationController.registerDevice
);

// Unregister device
router.delete(
  "/unregister",
  validate(unregisterDeviceSchema),
  notificationController.unregisterDevice
);

// Get user's registered devices
router.get("/", notificationController.getDevices);

module.exports = router;

export {};
