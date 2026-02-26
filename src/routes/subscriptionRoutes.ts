const express = require("express");
const { getSubscriptionInfo } = require("../middlewares/subscriptionMiddleware");
const { protect } = require("../middlewares/authMiddleware");

const router = express.Router();

/**
 * @swagger
 * /api/subscription/info:
 *   get:
 *     summary: Get current user's subscription information
 *     description: Returns subscription details including plan, usage, and trial status
 *     tags: [Subscription]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Subscription information retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     isPaid:
 *                       type: boolean
 *                     status:
 *                       type: string
 *                       enum: [trial, active, expired]
 *                     trialDaysRemaining:
 *                       type: number
 *                     trialExpired:
 *                       type: boolean
 *                     plan:
 *                       type: object
 *                       properties:
 *                         _id:
 *                           type: string
 *                         name:
 *                           type: string
 *                         price:
 *                           type: number
 *                         features:
 *                           type: object
 *                     usage:
 *                       type: object
 *                       properties:
 *                         workspaces:
 *                           type: number
 *                         spaces:
 *                           type: number
 *                         lists:
 *                           type: number
 *                         folders:
 *                           type: number
 *                         tasks:
 *                           type: number
 *       401:
 *         description: Authentication required
 *       404:
 *         description: User not found
 */
router.get("/info", protect, getSubscriptionInfo);

module.exports = router;

export {};
