import { Response, NextFunction } from "express";
import entitlementService from "../services/entitlementService";

const User = require("../models/User");
const Workspace = require("../models/Workspace");
const Plan = require("../models/Plan");
const List = require("../models/List");

interface AuthRequest {
  user?: {
    id: string;
    _id?: string;
    isSuperUser?: boolean;
  };
  workspace?: any;
  params?: any;
  body?: any;
}

/**
 * Check if user's subscription is valid and not expired
 */
const checkSubscriptionLimit = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    // Super users bypass all limits
    if (req.user?.isSuperUser) {
      return next();
    }

    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Authentication required"
      });
    }

    // Get user with subscription details
    const user = await User.findById(userId).populate('subscription.planId');
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }

    // If user has no subscription, treat as free/basic plan
    if (!user.subscription) {
      user.subscription = {
        isPaid: false,
        status: 'trial',
        trialStartedAt: user.createdAt
      };
    }

    // Check if trial has expired (30 days)
    const trialDuration = 30; // 30 days
    const trialStartDate = new Date(user.subscription.trialStartedAt || user.createdAt);
    const daysSinceStart = Math.floor(
      (Date.now() - trialStartDate.getTime()) / (1000 * 60 * 60 * 24)
    );
    const trialExpired = daysSinceStart > trialDuration;

    // If trial expired and not paid, restrict access
    if (trialExpired && !user.subscription.isPaid) {
      return res.status(403).json({
        success: false,
        message: "Your free trial has ended. Upgrade your plan to continue accessing all features and unlock unlimited potential.",
        code: "TRIAL_EXPIRED",
        trialDaysRemaining: 0,
        isPaid: false,
        action: "upgrade"
      });
    }

    // Attach subscription info to request for use in controllers
    (req as any).subscription = {
      isPaid: user.subscription.isPaid,
      status: user.subscription.status,
      plan: user.subscription.planId,
      trialExpired,
      trialDaysRemaining: Math.max(0, trialDuration - daysSinceStart)
    };

    next();
  } catch (error: any) {
    console.error("[Subscription Middleware] Error:", error);
    return res.status(500).json({
      success: false,
      message: "Error checking subscription status"
    });
  }
};

/**
 * Check workspace creation limit based on plan (GLOBAL across all workspaces)
 */
const checkWorkspaceLimit = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    // Super users bypass all limits
    if (req.user?.isSuperUser) {
      return next();
    }

    const userId = req.user?.id;
    const user = await User.findById(userId).populate('subscription.planId');
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }

    // Get GLOBAL usage for this user
    const usage = await entitlementService.getTotalUsage(userId);

    // Get plan limits
    let maxWorkspaces = 1; // Fallback if no plan found
    let planName = 'Free (Default)';
    
    if (user.subscription?.isPaid && user.subscription.planId) {
      // Paid user - use their plan
      const plan = user.subscription.planId;
      maxWorkspaces = plan.features?.maxWorkspaces ?? 1;
      planName = plan.name;
    } else {
      // Free user - try to find a free plan in database
      const Plan = require("../models/Plan");
      const freePlan = await Plan.findOne({ 
        name: { $regex: /free/i }, 
        isActive: true 
      }).lean();
      
      if (freePlan) {
        maxWorkspaces = freePlan.features?.maxWorkspaces ?? 1;
        planName = freePlan.name;
      }
    }

    // Check if limit reached (-1 means unlimited)
    if (maxWorkspaces !== -1 && usage.totalWorkspaces >= maxWorkspaces) {
      return res.status(403).json({
        success: false,
        message: `You've reached your workspace limit (${maxWorkspaces}). Upgrade your plan to create more workspaces and expand your team's productivity.`,
        code: "WORKSPACE_LIMIT_REACHED",
        currentCount: usage.totalWorkspaces,
        maxAllowed: maxWorkspaces,
        isPaid: user.subscription?.isPaid || false,
        action: "upgrade",
        feature: "workspaces"
      });
    }

    next();
  } catch (error: any) {
    console.error("[Workspace Limit] Error:", error);
    return res.status(500).json({
      success: false,
      message: "Error checking workspace limit"
    });
  }
};

/**
 * Check member invitation limit based on plan (checks workspace owner's limits)
 */
const checkMemberLimit = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    // Super users bypass all limits
    if (req.user?.isSuperUser) {
      return next();
    }

    const userId = req.user?.id;
    const workspaceId = req.params?.workspaceId || req.body?.workspaceId;

    if (!workspaceId) {
      return res.status(400).json({
        success: false,
        message: "Workspace ID required"
      });
    }

    // Get workspace and find the owner
    const workspace = await Workspace.findById(workspaceId);
    if (!workspace) {
      return res.status(404).json({
        success: false,
        message: "Workspace not found"
      });
    }

    // ALWAYS check the workspace owner's limits, not the current user
    const ownerId = workspace.owner.toString();

    // Get owner's subscription
    const owner = await User.findById(ownerId).populate('subscription.planId');
    if (!owner) {
      return res.status(404).json({
        success: false,
        message: "Workspace owner not found"
      });
    }

    // Get current ACTIVE member count (only count active members, not removed/inactive ones)
    const currentMemberCount = workspace.members?.filter((m: any) => m.status === 'active').length || 0;

    console.log('[Member Limit] Total members in array:', workspace.members?.length);
    console.log('[Member Limit] Active members:', currentMemberCount);

    // Get plan limits from OWNER's subscription
    let maxMembers = 5; // Fallback if no plan found
    let planName = 'Free (Default)';
    
    console.log('[Member Limit] Owner subscription:', JSON.stringify(owner.subscription, null, 2));
    
    if (owner.subscription?.isPaid && owner.subscription.planId) {
      // Paid user - use their plan
      const plan = owner.subscription.planId;
      console.log('[Member Limit] Plan object:', JSON.stringify(plan, null, 2));
      console.log('[Member Limit] Plan features:', plan.features);
      
      maxMembers = plan.features?.maxMembers ?? 5;
      planName = plan.name || 'Unknown Plan';
      
      console.log('[Member Limit] Using plan:', planName, 'with maxMembers:', maxMembers);
    } else {
      console.log('[Member Limit] No paid plan, checking for free plan in database');
      // Free user - try to find a free plan in database
      const Plan = require("../models/Plan");
      const freePlan = await Plan.findOne({ 
        name: { $regex: /free/i }, 
        isActive: true 
      }).lean();
      
      if (freePlan) {
        maxMembers = freePlan.features?.maxMembers ?? 5;
        planName = freePlan.name;
        console.log('[Member Limit] Using free plan:', planName, 'with maxMembers:', maxMembers);
      } else {
        console.log('[Member Limit] No free plan found, using fallback maxMembers:', maxMembers);
      }
    }

    console.log('[Member Limit] Max members allowed:', maxMembers);
    console.log('[Member Limit] Current active members:', currentMemberCount);
    console.log('[Member Limit] After adding new member:', currentMemberCount + 1);
    console.log('[Member Limit] Check: Will adding new member exceed limit?', (currentMemberCount + 1) > maxMembers);

    // Check if adding a new member would exceed the limit (-1 means unlimited)
    if (maxMembers !== -1 && currentMemberCount >= maxMembers) {
      console.log('[Member Limit] BLOCKED: Member limit reached');
      return res.status(403).json({
        success: false,
        message: `This workspace has reached its member limit (${currentMemberCount}/${maxMembers}). Upgrade your plan to invite more team members and collaborate better.`,
        code: "MEMBER_LIMIT_REACHED",
        currentCount: currentMemberCount,
        maxAllowed: maxMembers,
        isPaid: owner.subscription?.isPaid || false,
        action: "upgrade",
        feature: "members"
      });
    }

    console.log('[Member Limit] ALLOWED: Can add new member');
    next();
  } catch (error: any) {
    console.error("[Member Limit] Error:", error);
    return res.status(500).json({
      success: false,
      message: "Error checking member limit"
    });
  }
};

/**
 * Check if user's plan has access control feature
 */
const checkAccessControlFeature = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    // Super users bypass all limits
    if (req.user?.isSuperUser) {
      return next();
    }

    const userId = req.user?.id;
    const user = await User.findById(userId).populate('subscription.planId');
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }

    // Check if plan has access control
    let hasAccessControl = false;
    
    if (user.subscription?.isPaid && user.subscription.planId) {
      const plan = user.subscription.planId;
      hasAccessControl = plan.features?.hasAccessControl || false;
    }

    if (!hasAccessControl) {
      return res.status(403).json({
        success: false,
        message: "Advanced access control features are not available in your current plan. Upgrade to Pro or Advanced to unlock custom permissions and role management.",
        code: "ACCESS_CONTROL_UNAVAILABLE",
        isPaid: user.subscription?.isPaid || false,
        action: "upgrade",
        feature: "access_control"
      });
    }

    next();
  } catch (error: any) {
    console.error("[Access Control Check] Error:", error);
    return res.status(500).json({
      success: false,
      message: "Error checking access control feature"
    });
  }
};

/**
 * Check task creation limit based on plan (GLOBAL across all workspaces owned by workspace owner)
 */
const checkTaskLimit = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    // Super users bypass all limits
    if (req.user?.isSuperUser) {
      return next();
    }

    // Get workspace ID from various possible locations
    const workspaceId = req.body?.workspace || req.params?.workspaceId;
    const listId = req.body?.list || req.params?.listId;

    // If we have listId but not workspaceId, get it from the list
    let finalWorkspaceId = workspaceId;
    if (!finalWorkspaceId && listId) {
      const list = await List.findById(listId).select('workspace').lean();
      if (list) {
        finalWorkspaceId = list.workspace.toString();
      }
    }

    if (!finalWorkspaceId) {
      return res.status(400).json({
        success: false,
        message: "Workspace ID required"
      });
    }

    // Get workspace owner
    const ownerId = await entitlementService.getWorkspaceOwner(finalWorkspaceId);

    // Get owner's subscription
    const owner = await User.findById(ownerId).populate('subscription.planId');
    if (!owner) {
      return res.status(404).json({
        success: false,
        message: "Workspace owner not found"
      });
    }

    // Get GLOBAL usage for the workspace owner
    const usage = await entitlementService.getTotalUsage(ownerId);

    // Get plan limits from OWNER's subscription
    let maxTasks = 100; // Fallback if no plan found
    let planName = 'Free (Default)';
    
    if (owner.subscription?.isPaid && owner.subscription.planId) {
      // Paid user - use their plan
      const plan = owner.subscription.planId;
      maxTasks = plan.features?.maxTasks ?? 100;
      planName = plan.name;
    } else {
      // Free user - try to find a free plan in database
      const Plan = require("../models/Plan");
      const freePlan = await Plan.findOne({ 
        name: { $regex: /free/i }, 
        isActive: true 
      }).lean();
      
      if (freePlan) {
        maxTasks = freePlan.features?.maxTasks ?? 100;
        planName = freePlan.name;
      }
    }

    // Check if limit reached (-1 means unlimited)
    if (maxTasks !== -1 && usage.totalTasks >= maxTasks) {
      return res.status(403).json({
        success: false,
        message: `You've reached your task limit (${maxTasks} tasks). Upgrade your plan to create unlimited tasks and manage larger projects.`,
        code: "TASK_LIMIT_REACHED",
        currentCount: usage.totalTasks,
        maxAllowed: maxTasks,
        isPaid: owner.subscription?.isPaid || false,
        action: "upgrade",
        feature: "tasks"
      });
    }

    next();
  } catch (error: any) {
    console.error("[Task Limit] Error:", error);
    return res.status(500).json({
      success: false,
      message: "Error checking task limit"
    });
  }
};

/**
 * Check space creation limit based on plan (GLOBAL across all workspaces owned by workspace owner)
 */
const checkSpaceLimit = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    // Super users bypass all limits
    if (req.user?.isSuperUser) {
      return next();
    }

    // Get workspace ID from params
    const workspaceId = req.params?.workspaceId;

    if (!workspaceId) {
      return res.status(400).json({
        success: false,
        message: "Workspace ID required"
      });
    }

    // Get workspace owner
    const ownerId = await entitlementService.getWorkspaceOwner(workspaceId);

    // Get owner's subscription
    const owner = await User.findById(ownerId).populate('subscription.planId');
    if (!owner) {
      return res.status(404).json({
        success: false,
        message: "Workspace owner not found"
      });
    }

    // Get GLOBAL usage for the workspace owner
    const usage = await entitlementService.getTotalUsage(ownerId);

    // Get plan limits from OWNER's subscription
    let maxSpaces = 2; // Fallback if no plan found
    let planName = 'Free (Default)';
    
    if (owner.subscription?.isPaid && owner.subscription.planId) {
      // Paid user - use their plan
      const plan = owner.subscription.planId;
      maxSpaces = plan.features?.maxSpaces ?? 2;
      planName = plan.name;
    } else {
      // Free user - try to find a free plan in database
      const Plan = require("../models/Plan");
      const freePlan = await Plan.findOne({ 
        name: { $regex: /free/i }, 
        isActive: true 
      }).lean();
      
      if (freePlan) {
        maxSpaces = freePlan.features?.maxSpaces ?? 2;
        planName = freePlan.name;
      }
    }

    // Check if limit reached (-1 means unlimited)
    if (maxSpaces !== -1 && usage.totalSpaces >= maxSpaces) {
      return res.status(403).json({
        success: false,
        message: `You've reached your space limit (${maxSpaces} spaces). Upgrade your plan to create more spaces and organize your work better.`,
        code: "SPACE_LIMIT_REACHED",
        currentCount: usage.totalSpaces,
        maxAllowed: maxSpaces,
        isPaid: owner.subscription?.isPaid || false,
        action: "upgrade",
        feature: "spaces"
      });
    }

    next();
  } catch (error: any) {
    console.error("[Space Limit] Error:", error);
    return res.status(500).json({
      success: false,
      message: "Error checking space limit"
    });
  }
};

/**
 * Check list creation limit based on plan (GLOBAL across all workspaces owned by workspace owner)
 */
const checkListLimit = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    console.log('[checkListLimit] Starting list limit check');
    
    // Super users bypass all limits
    if (req.user?.isSuperUser) {
      console.log('[checkListLimit] Super user detected, bypassing limit');
      return next();
    }

    // Get space ID from params
    const spaceId = req.params?.spaceId;
    console.log('[checkListLimit] Space ID:', spaceId);

    if (!spaceId) {
      console.log('[checkListLimit] No space ID found');
      return res.status(400).json({
        success: false,
        message: "Space ID required"
      });
    }

    // Get space to find workspace
    const Space = require("../models/Space");
    const space = await Space.findById(spaceId).select('workspace').lean();
    if (!space) {
      console.log('[checkListLimit] Space not found');
      return res.status(404).json({
        success: false,
        message: "Space not found"
      });
    }

    console.log('[checkListLimit] Found space, workspace ID:', space.workspace);

    // Get workspace owner
    const ownerId = await entitlementService.getWorkspaceOwner(space.workspace.toString());
    console.log('[checkListLimit] Workspace owner ID:', ownerId);

    // Get owner's subscription
    const owner = await User.findById(ownerId).populate('subscription.planId');
    if (!owner) {
      console.log('[checkListLimit] Owner not found');
      return res.status(404).json({
        success: false,
        message: "Workspace owner not found"
      });
    }

    // Get GLOBAL usage for the workspace owner
    const usage = await entitlementService.getTotalUsage(ownerId);
    console.log('[checkListLimit] Current usage:', usage);

    // Get plan limits from OWNER's subscription
    let maxLists = 4; // Fallback if no plan found
    let planName = 'Free (Default)';
    
    if (owner.subscription?.isPaid && owner.subscription.planId) {
      // Paid user - use their plan
      const plan = owner.subscription.planId;
      maxLists = plan.features?.maxLists ?? 4;
      planName = plan.name;
      console.log('[checkListLimit] Paid plan found:', planName, 'maxLists:', maxLists);
    } else {
      // Free user - try to find a free plan in database
      const Plan = require("../models/Plan");
      const freePlan = await Plan.findOne({ 
        name: { $regex: /free/i }, 
        isActive: true 
      }).lean();
      
      if (freePlan) {
        maxLists = freePlan.features?.maxLists ?? 4;
        planName = freePlan.name;
        console.log('[checkListLimit] Free plan found in database:', planName, 'maxLists:', maxLists);
      } else {
        console.log('[checkListLimit] No plan found, using hardcoded fallback:', maxLists);
      }
    }

    console.log('[checkListLimit] Max lists allowed:', maxLists);
    console.log('[checkListLimit] Current list count:', usage.totalLists);
    console.log('[checkListLimit] Check:', usage.totalLists, '>=', maxLists, '=', usage.totalLists >= maxLists);

    // Check if limit reached (-1 means unlimited)
    if (maxLists !== -1 && usage.totalLists >= maxLists) {
      console.log('[checkListLimit] List limit reached!');
      return res.status(403).json({
        success: false,
        message: `You've reached your list limit (${maxLists} lists). Upgrade your plan to create more lists and manage your tasks better.`,
        code: "LIST_LIMIT_REACHED",
        currentCount: usage.totalLists,
        maxAllowed: maxLists,
        isPaid: owner.subscription?.isPaid || false,
        action: "upgrade",
        feature: "lists"
      });
    }

    console.log('[checkListLimit] Limit check passed, proceeding');
    next();
  } catch (error: any) {
    console.error("[List Limit] Error:", error);
    return res.status(500).json({
      success: false,
      message: "Error checking list limit"
    });
  }
};

/**
 * Check folder creation limit based on plan (GLOBAL across all workspaces owned by workspace owner)
 */
const checkFolderLimit = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    console.log('[checkFolderLimit] Starting folder limit check');
    
    // Super users bypass all limits
    if (req.user?.isSuperUser) {
      console.log('[checkFolderLimit] Super user detected, bypassing limit');
      return next();
    }

    // Get space ID from params or body
    const spaceId = req.params?.spaceId || req.body?.space;
    console.log('[checkFolderLimit] Space ID:', spaceId);

    if (!spaceId) {
      console.log('[checkFolderLimit] No space ID found');
      return res.status(400).json({
        success: false,
        message: "Space ID required"
      });
    }

    // Get space to find workspace
    const Space = require("../models/Space");
    const space = await Space.findById(spaceId).select('workspace').lean();
    if (!space) {
      console.log('[checkFolderLimit] Space not found');
      return res.status(404).json({
        success: false,
        message: "Space not found"
      });
    }

    console.log('[checkFolderLimit] Found space, workspace ID:', space.workspace);

    // Get workspace owner
    const ownerId = await entitlementService.getWorkspaceOwner(space.workspace.toString());
    console.log('[checkFolderLimit] Workspace owner ID:', ownerId);

    // Get owner's subscription
    const owner = await User.findById(ownerId).populate('subscription.planId');
    if (!owner) {
      console.log('[checkFolderLimit] Owner not found');
      return res.status(404).json({
        success: false,
        message: "Workspace owner not found"
      });
    }

    // Get GLOBAL usage for the workspace owner
    const usage = await entitlementService.getTotalUsage(ownerId);
    console.log('[checkFolderLimit] Current usage:', usage);

    // Get plan limits from OWNER's subscription
    let maxFolders = 2; // Fallback if no plan found
    let planName = 'Free (Default)';
    
    if (owner.subscription?.isPaid && owner.subscription.planId) {
      // Paid user - use their plan
      const plan = owner.subscription.planId;
      maxFolders = plan.features?.maxFolders ?? 2;
      planName = plan.name;
      console.log('[checkFolderLimit] Paid plan found:', planName, 'maxFolders:', maxFolders);
    } else {
      // Free user - try to find a free plan in database
      const Plan = require("../models/Plan");
      const freePlan = await Plan.findOne({ 
        name: { $regex: /free/i }, 
        isActive: true 
      }).lean();
      
      if (freePlan) {
        maxFolders = freePlan.features?.maxFolders ?? 2;
        planName = freePlan.name;
        console.log('[checkFolderLimit] Free plan found in database:', planName, 'maxFolders:', maxFolders);
      } else {
        console.log('[checkFolderLimit] No plan found, using hardcoded fallback:', maxFolders);
      }
    }

    console.log('[checkFolderLimit] Max folders allowed:', maxFolders);
    console.log('[checkFolderLimit] Current folder count:', usage.totalFolders);

    // Check if limit reached (-1 means unlimited)
    if (maxFolders !== -1 && usage.totalFolders >= maxFolders) {
      console.log('[checkFolderLimit] Folder limit reached!');
      return res.status(403).json({
        success: false,
        message: `You've reached your folder limit (${maxFolders} folders). Upgrade your plan to create more folders and organize your spaces better.`,
        code: "FOLDER_LIMIT_REACHED",
        currentCount: usage.totalFolders,
        maxAllowed: maxFolders,
        isPaid: owner.subscription?.isPaid || false,
        action: "upgrade",
        feature: "folders"
      });
    }

    console.log('[checkFolderLimit] Limit check passed, proceeding');
    next();
  } catch (error: any) {
    console.error("[Folder Limit] Error:", error);
    return res.status(500).json({
      success: false,
      message: "Error checking folder limit"
    });
  }
};

/**
 * Get user's subscription info (for frontend) - with GLOBAL usage
 */
const getSubscriptionInfo = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const user = await User.findById(userId).populate('subscription.planId');
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }

    // Calculate trial info
    const trialDuration = 30;
    const trialStartDate = new Date(user.subscription?.trialStartedAt || user.createdAt);
    const daysSinceStart = Math.floor(
      (Date.now() - trialStartDate.getTime()) / (1000 * 60 * 60 * 24)
    );
    const trialDaysRemaining = Math.max(0, trialDuration - daysSinceStart);
    const trialExpired = daysSinceStart > trialDuration;

    // Get GLOBAL usage across all workspaces owned by this user
    const usage = await entitlementService.getTotalUsage(userId);

    // Get plan details
    let planDetails = null;
    
    if (user.subscription?.isPaid && user.subscription.planId) {
      // Paid user - use their assigned plan
      planDetails = user.subscription.planId;
    } else {
      // Free user - fetch free plan from database
      const Plan = require("../models/Plan");
      const freePlan = await Plan.findOne({ 
        name: { $regex: /free/i }, 
        isActive: true 
      }).lean();
      
      if (freePlan) {
        planDetails = freePlan;
      }
    }

    res.status(200).json({
      success: true,
      data: {
        isPaid: user.subscription?.isPaid || false,
        status: user.subscription?.status || 'trial',
        trialDaysRemaining,
        trialExpired,
        plan: planDetails ? {
          _id: planDetails._id,
          name: planDetails.name,
          price: planDetails.price,
          features: planDetails.features
        } : null,
        usage: {
          workspaces: usage.totalWorkspaces,
          spaces: usage.totalSpaces,
          lists: usage.totalLists,
          folders: usage.totalFolders,
          tasks: usage.totalTasks
        }
      }
    });
  } catch (error: any) {
    console.error("[Get Subscription Info] Error:", error);
    return res.status(500).json({
      success: false,
      message: "Error fetching subscription info"
    });
  }
};

module.exports = {
  checkSubscriptionLimit,
  checkWorkspaceLimit,
  checkMemberLimit,
  checkAccessControlFeature,
  checkTaskLimit,
  checkSpaceLimit,
  checkListLimit,
  checkFolderLimit,
  getSubscriptionInfo
};

export {};
