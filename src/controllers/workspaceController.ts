import { Response, NextFunction } from "express";
import { AuthRequest } from "../types/express";
import xss from "xss";

const asyncHandler = require("../utils/asyncHandler");
const workspaceService = require("../services/workspaceService");
const AppError = require("../utils/AppError");

// @desc    Create new workspace
// @route   POST /api/workspaces
// @access  Private
const createWorkspace = asyncHandler(async (req: AuthRequest, res: Response, next: NextFunction) => {
  const { name } = req.body;

  if (!name) {
    throw new AppError("Please provide workspace name", 400);
  }

  const workspace = await workspaceService.createWorkspace({
    name,
    owner: req.user!.id
  });

  res.status(201).json({
    success: true,
    data: workspace
  });
});

// @desc    Get all user workspaces
// @route   GET /api/workspaces
// @access  Private
const getMyWorkspaces = asyncHandler(async (req: AuthRequest, res: Response, next: NextFunction) => {
  const workspaces = await workspaceService.getUserWorkspaces(req.user!.id);

  res.status(200).json({
    success: true,
    count: workspaces.length,
    data: workspaces
  });
});

// @desc    Get single workspace
// @route   GET /api/workspaces/:id
// @access  Private
const getWorkspace = asyncHandler(async (req: AuthRequest, res: Response, next: NextFunction) => {
  console.log('[WorkspaceController] getWorkspace called', { workspaceId: req.params.id });
  
  const workspace = await workspaceService.getWorkspaceById(req.params.id, req.user!.id);

  console.log('[WorkspaceController] Workspace retrieved successfully', { workspaceId: workspace._id });

  res.status(200).json({
    success: true,
    data: workspace
  });
});

// @desc    Update workspace
// @route   PUT /api/workspaces/:id
// @access  Private
const updateWorkspace = asyncHandler(async (req: AuthRequest, res: Response, next: NextFunction) => {
  const { name } = req.body;

  const workspace = await workspaceService.updateWorkspace(req.params.id, req.user!.id, { name });

  res.status(200).json({
    success: true,
    data: workspace
  });
});

// @desc    Delete workspace
// @route   DELETE /api/workspaces/:id
// @access  Private
const deleteWorkspace = asyncHandler(async (req: AuthRequest, res: Response, next: NextFunction) => {
  const result = await workspaceService.deleteWorkspace(req.params.id, req.user!.id);

  res.status(200).json({
    success: true,
    data: result
  });
});

// @desc    Get workspace analytics data
// @route   GET /api/workspaces/:id/analytics
// @access  Private
const getWorkspaceAnalytics = asyncHandler(async (req: AuthRequest, res: Response, next: NextFunction) => {
  const analytics = await workspaceService.getWorkspaceAnalytics(req.params.id, req.user!.id);

  res.status(200).json({
    success: true,
    data: analytics
  });
});

// @desc    Update member custom role title
// @route   PATCH /api/workspaces/:workspaceId/members/:memberId/custom-role
// @access  Private (Workspace Owner Only)
const updateMemberCustomRole = asyncHandler(async (req: AuthRequest, res: Response, next: NextFunction) => {
  const { workspaceId, memberId } = req.params;
  let { customRoleTitle } = req.body;

  // Validate customRoleTitle
  if (customRoleTitle !== null && customRoleTitle !== undefined) {
    // Sanitize input with xss library
    customRoleTitle = xss(customRoleTitle);
    
    // Validate length (max 50 chars)
    if (customRoleTitle.length > 50) {
      throw new AppError("Custom role title cannot exceed 50 characters", 400);
    }
    
    // Trim whitespace
    customRoleTitle = customRoleTitle.trim();
    
    // If empty after trimming, set to null
    if (customRoleTitle === "") {
      customRoleTitle = null;
    }
  }

  // Check custom role limit if adding a new custom role
  if (customRoleTitle) {
    const EntitlementService = require('../services/entitlementService').default;
    const Workspace = require('../models/Workspace');
    
    // Get workspace to check current custom roles
    const workspace = await Workspace.findById(workspaceId);
    if (!workspace) {
      throw new AppError('Workspace not found', 404);
    }
    
    // Get the member being updated
    const member = workspace.members.find((m: any) => m.user.toString() === memberId);
    if (!member) {
      throw new AppError('Member not found', 404);
    }
    
    // If member doesn't already have a custom role, check the limit
    if (!member.customRoleTitle) {
      // Count current custom roles in workspace
      const currentCustomRoleCount = workspace.members.filter((m: any) => 
        m.customRoleTitle && m.customRoleTitle.trim() !== ''
      ).length;
      
      // Get owner's plan limits
      const ownerId = workspace.owner.toString();
      const User = require('../models/User');
      const PlanInheritanceService = require('../services/planInheritanceService').default;
      
      const owner = await User.findById(ownerId).populate('subscription.planId');
      if (!owner || !owner.subscription?.planId) {
        throw new AppError('Owner subscription not found', 404);
      }
      
      const resolvedFeatures = await PlanInheritanceService.resolveFeatures(owner.subscription.planId);
      const maxCustomRoles = resolvedFeatures.maxCustomRoles || 0;
      
      // Check if limit is reached
      if (maxCustomRoles !== -1 && currentCustomRoleCount >= maxCustomRoles) {
        return res.status(400).json({
          success: false,
          code: 'CUSTOM_ROLE_LIMIT_REACHED',
          message: `Custom role limit reached (${currentCustomRoleCount}/${maxCustomRoles}). Upgrade your plan to add more custom roles.`,
          currentCount: currentCustomRoleCount,
          maxAllowed: maxCustomRoles
        });
      }
    }
  }

  // Update the member's custom role
  const updatedMember = await workspaceService.updateMemberCustomRole(
    workspaceId,
    memberId,
    customRoleTitle
  );

  res.status(200).json({
    success: true,
    member: updatedMember
  });
});

module.exports = {
  createWorkspace,
  getMyWorkspaces,
  getWorkspace,
  updateWorkspace,
  deleteWorkspace,
  getWorkspaceAnalytics,
  updateMemberCustomRole
};

export {};
