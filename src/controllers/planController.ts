const Plan = require("../models/Plan");
const asyncHandler = require("../utils/asyncHandler");

/**
 * @desc    Create a new plan
 * @route   POST /api/plans
 * @access  Private (Super User only)
 */
const createPlan = asyncHandler(async (req: any, res: any) => {
  const { name, price, description, features, isActive, parentPlanId } = req.body;

  // Check if user is super user
  if (!req.user.isSuperUser) {
    res.status(403);
    throw new Error("Access denied. Super user privileges required.");
  }

  // Check if plan with same name already exists
  const existingPlan = await Plan.findOne({ name });
  if (existingPlan) {
    res.status(400);
    throw new Error("Plan with this name already exists");
  }

  // Initialize plan features
  let planFeatures = {
    maxWorkspaces: features?.maxWorkspaces || 1,
    maxMembers: features?.maxMembers || 5,
    maxAdmins: features?.maxAdmins || 1,
    maxSpaces: features?.maxSpaces || 10,
    maxLists: features?.maxLists || 50,
    maxFolders: features?.maxFolders || 20,
    maxTasks: features?.maxTasks || 100,
    hasAccessControl: features?.hasAccessControl || false,
    hasGroupChat: features?.hasGroupChat || false,
    messageLimit: features?.messageLimit || 100,
    announcementCooldown: features?.announcementCooldown || 24,
    accessControlTier: features?.accessControlTier || 'none'
  };

  // If parentPlanId is provided, inherit features from parent plan
  if (parentPlanId) {
    const parentPlan = await Plan.findById(parentPlanId);
    if (!parentPlan) {
      res.status(404);
      throw new Error("Parent plan not found");
    }

    // Merge parent features with new features (new features override parent)
    planFeatures = {
      maxWorkspaces: features?.maxWorkspaces !== undefined ? features.maxWorkspaces : parentPlan.features.maxWorkspaces,
      maxMembers: features?.maxMembers !== undefined ? features.maxMembers : parentPlan.features.maxMembers,
      maxAdmins: features?.maxAdmins !== undefined ? features.maxAdmins : parentPlan.features.maxAdmins,
      maxSpaces: features?.maxSpaces !== undefined ? features.maxSpaces : parentPlan.features.maxSpaces,
      maxLists: features?.maxLists !== undefined ? features.maxLists : parentPlan.features.maxLists,
      maxFolders: features?.maxFolders !== undefined ? features.maxFolders : parentPlan.features.maxFolders,
      maxTasks: features?.maxTasks !== undefined ? features.maxTasks : parentPlan.features.maxTasks,
      hasAccessControl: features?.hasAccessControl !== undefined ? features.hasAccessControl : parentPlan.features.hasAccessControl,
      hasGroupChat: features?.hasGroupChat !== undefined ? features.hasGroupChat : parentPlan.features.hasGroupChat,
      messageLimit: features?.messageLimit !== undefined ? features.messageLimit : parentPlan.features.messageLimit,
      announcementCooldown: features?.announcementCooldown !== undefined ? features.announcementCooldown : parentPlan.features.announcementCooldown,
      accessControlTier: features?.accessControlTier !== undefined ? features.accessControlTier : parentPlan.features.accessControlTier
    };
  }

  const plan = await Plan.create({
    name,
    price,
    description,
    parentPlanId: parentPlanId || null,
    features: planFeatures,
    isActive: isActive !== undefined ? isActive : true
  });

  res.status(201).json({
    success: true,
    data: plan
  });
});

/**
 * @desc    Get all plans
 * @route   GET /api/plans
 * @access  Public
 */
const getPlans = asyncHandler(async (req: any, res: any) => {
  const { includeInactive } = req.query;

  // Build query
  const query: any = {};
  
  // By default, only show active plans unless includeInactive is true
  if (includeInactive !== 'true') {
    query.isActive = true;
  }

  const plans = await Plan.find(query).sort({ price: 1 });

  res.status(200).json({
    success: true,
    count: plans.length,
    data: plans
  });
});

/**
 * @desc    Get single plan by ID
 * @route   GET /api/plans/:id
 * @access  Public
 */
const getPlan = asyncHandler(async (req: any, res: any) => {
  const plan = await Plan.findById(req.params.id);

  if (!plan) {
    res.status(404);
    throw new Error("Plan not found");
  }

  res.status(200).json({
    success: true,
    data: plan
  });
});

/**
 * @desc    Update a plan
 * @route   PUT /api/plans/:id
 * @access  Private (Super User only)
 */
const updatePlan = asyncHandler(async (req: any, res: any) => {
  // Check if user is super user
  if (!req.user.isSuperUser) {
    res.status(403);
    throw new Error("Access denied. Super user privileges required.");
  }

  let plan = await Plan.findById(req.params.id);

  if (!plan) {
    res.status(404);
    throw new Error("Plan not found");
  }

  const { name, price, description, features, isActive } = req.body;

  // Check if updating name to an existing plan name
  if (name && name !== plan.name) {
    const existingPlan = await Plan.findOne({ name });
    if (existingPlan) {
      res.status(400);
      throw new Error("Plan with this name already exists");
    }
  }

  plan = await Plan.findByIdAndUpdate(
    req.params.id,
    {
      name,
      price,
      description,
      features,
      isActive
    },
    {
      new: true,
      runValidators: true
    }
  );

  res.status(200).json({
    success: true,
    data: plan
  });
});

/**
 * @desc    Delete a plan (soft delete by setting isActive to false)
 * @route   DELETE /api/plans/:id
 * @access  Private (Super User only)
 */
const deletePlan = asyncHandler(async (req: any, res: any) => {
  // Check if user is super user
  if (!req.user.isSuperUser) {
    res.status(403);
    throw new Error("Access denied. Super user privileges required.");
  }

  const plan = await Plan.findById(req.params.id);

  if (!plan) {
    res.status(404);
    throw new Error("Plan not found");
  }

  // Soft delete by setting isActive to false
  plan.isActive = false;
  await plan.save();

  res.status(200).json({
    success: true,
    message: "Plan deactivated successfully",
    data: plan
  });
});

module.exports = {
  createPlan,
  getPlans,
  getPlan,
  updatePlan,
  deletePlan
};

export {};
