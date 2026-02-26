const User = require("../models/User");
const Workspace = require("../models/Workspace");
const Plan = require("../models/Plan");
const SystemSettings = require("../models/SystemSettings");
const asyncHandler = require("../utils/asyncHandler");

/**
 * @desc    Get all workspace admins/owners with subscription details
 * @route   GET /api/super-admin/users
 * @access  Private (Super User only)
 */
const getAdminUsers = asyncHandler(async (req: any, res: any) => {
  if (!req.user.isSuperUser) {
    res.status(403);
    throw new Error("Access denied. Super user privileges required.");
  }

  // Find all workspaces and get their owners
  const workspaces = await Workspace.find({ isDeleted: false })
    .populate("owner", "name email subscription createdAt")
    .select("name owner");

  // Get unique admin users
  const adminUserIds = new Set();
  const adminUsers: any[] = [];

  for (const workspace of workspaces) {
    if (workspace.owner && !adminUserIds.has(workspace.owner._id.toString())) {
      adminUserIds.add(workspace.owner._id.toString());
      
      const user = workspace.owner;
      const workspaceCount = await Workspace.countDocuments({ 
        owner: user._id, 
        isDeleted: false 
      });

      // Calculate trial days remaining
      let trialDaysRemaining = 0;
      if (user.subscription?.status === 'trial' && user.subscription?.trialStartedAt) {
        const trialDuration = 14; // 14 days trial
        const daysSinceStart = Math.floor(
          (Date.now() - new Date(user.subscription.trialStartedAt).getTime()) / (1000 * 60 * 60 * 24)
        );
        trialDaysRemaining = Math.max(0, trialDuration - daysSinceStart);
      }

      // Get plan details if exists
      let planDetails = null;
      if (user.subscription?.planId) {
        planDetails = await Plan.findById(user.subscription.planId);
      }

      adminUsers.push({
        _id: user._id,
        name: user.name,
        email: user.email,
        workspaceCount,
        subscription: {
          planId: user.subscription?.planId || null,
          planName: planDetails?.name || "No Plan",
          planPrice: planDetails?.price || 0,
          isPaid: user.subscription?.isPaid || false,
          status: user.subscription?.status || "trial",
          trialStartedAt: user.subscription?.trialStartedAt || user.createdAt,
          trialDaysRemaining
        },
        createdAt: user.createdAt
      });
    }
  }

  res.status(200).json({
    success: true,
    count: adminUsers.length,
    data: adminUsers
  });
});

/**
 * @desc    Update user subscription status
 * @route   PATCH /api/super-admin/users/:userId/subscription
 * @access  Private (Super User only)
 */
const updateUserSubscription = asyncHandler(async (req: any, res: any) => {
  if (!req.user.isSuperUser) {
    res.status(403);
    throw new Error("Access denied. Super user privileges required.");
  }

  const { userId } = req.params;
  const { isPaid, planId, status } = req.body;

  const user = await User.findById(userId);
  if (!user) {
    res.status(404);
    throw new Error("User not found");
  }

  // Verify plan exists if planId is provided
  if (planId) {
    const plan = await Plan.findById(planId);
    if (!plan) {
      res.status(404);
      throw new Error("Plan not found");
    }
  }

  // Update subscription
  if (!user.subscription) {
    user.subscription = {};
  }

  if (isPaid !== undefined) {
    user.subscription.isPaid = isPaid;
    if (isPaid) {
      user.subscription.status = 'active';
    }
  }

  if (planId !== undefined) {
    user.subscription.planId = planId;
  }

  if (status !== undefined) {
    user.subscription.status = status;
  }

  await user.save();

  // Get updated user with plan details
  const updatedUser = await User.findById(userId).populate('subscription.planId');

  res.status(200).json({
    success: true,
    data: updatedUser
  });
});

/**
 * @desc    Get financial analytics
 * @route   GET /api/super-admin/analytics
 * @access  Private (Super User only)
 */
const getFinancialAnalytics = asyncHandler(async (req: any, res: any) => {
  if (!req.user.isSuperUser) {
    res.status(403);
    throw new Error("Access denied. Super user privileges required.");
  }

  // Get all users with subscriptions
  const allUsers = await User.find({}).populate('subscription.planId');
  
  // Calculate total revenue (sum of all paid users' plan prices)
  let totalRevenue = 0;
  const paidUsers = allUsers.filter(user => user.subscription?.isPaid);
  
  for (const user of paidUsers) {
    if (user.subscription?.planId && typeof user.subscription.planId === 'object') {
      totalRevenue += user.subscription.planId.price || 0;
    }
  }

  // Calculate conversion rate
  const trialUsers = allUsers.filter(user => user.subscription?.status === 'trial');
  const conversionRate = allUsers.length > 0 
    ? ((paidUsers.length / allUsers.length) * 100).toFixed(2)
    : "0";

  // Get new signups per week (last 12 weeks)
  const twelveWeeksAgo = new Date();
  twelveWeeksAgo.setDate(twelveWeeksAgo.getDate() - 84); // 12 weeks

  const signupsByWeek = await User.aggregate([
    {
      $match: {
        createdAt: { $gte: twelveWeeksAgo }
      }
    },
    {
      $group: {
        _id: {
          year: { $year: "$createdAt" },
          week: { $week: "$createdAt" }
        },
        count: { $sum: 1 }
      }
    },
    {
      $sort: { "_id.year": 1, "_id.week": 1 }
    }
  ]);

  // Format signup data for chart
  const signupData = signupsByWeek.map(item => ({
    week: `Week ${item._id.week}`,
    count: item.count,
    year: item._id.year
  }));

  // Additional metrics
  const totalUsers = allUsers.length;
  const activeSubscriptions = allUsers.filter(
    user => user.subscription?.status === 'active'
  ).length;
  const expiredSubscriptions = allUsers.filter(
    user => user.subscription?.status === 'expired'
  ).length;

  res.status(200).json({
    success: true,
    data: {
      totalRevenue,
      conversionRate: parseFloat(conversionRate),
      signupData,
      metrics: {
        totalUsers,
        paidUsers: paidUsers.length,
        trialUsers: trialUsers.length,
        activeSubscriptions,
        expiredSubscriptions
      }
    }
  });
});

/**
 * @desc    Get or create system settings
 * @route   GET /api/super-admin/settings
 * @access  Private (Super User only)
 */
const getSystemSettings = asyncHandler(async (req: any, res: any) => {
  if (!req.user.isSuperUser) {
    res.status(403);
    throw new Error("Access denied. Super user privileges required.");
  }

  let settings = await SystemSettings.findOne();
  
  if (!settings) {
    settings = await SystemSettings.create({
      whatsappContactNumber: "+1234567890",
      updatedBy: req.user._id
    });
  }

  res.status(200).json({
    success: true,
    data: settings
  });
});

/**
 * @desc    Update system settings
 * @route   PUT /api/super-admin/settings
 * @access  Private (Super User only)
 */
const updateSystemSettings = asyncHandler(async (req: any, res: any) => {
  if (!req.user.isSuperUser) {
    res.status(403);
    throw new Error("Access denied. Super user privileges required.");
  }

  const { whatsappContactNumber } = req.body;

  let settings = await SystemSettings.findOne();
  
  if (!settings) {
    settings = await SystemSettings.create({
      whatsappContactNumber,
      updatedBy: req.user._id
    });
  } else {
    settings.whatsappContactNumber = whatsappContactNumber;
    settings.updatedBy = req.user._id;
    await settings.save();
  }

  res.status(200).json({
    success: true,
    data: settings
  });
});

module.exports = {
  getAdminUsers,
  updateUserSubscription,
  getFinancialAnalytics,
  getSystemSettings,
  updateSystemSettings
};

export {};
