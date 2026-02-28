import { Response, NextFunction } from "express";

const Workspace = require("../models/Workspace");

interface AuthRequest {
  user?: {
    id: string;
    _id?: string;
  };
  params?: any;
  workspace?: any;
}

/**
 * Middleware to ensure only workspace owners can perform certain actions
 * Requires workspace context to be set (usually by requirePermission middleware)
 */
const ownerOnly = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.id;
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Authentication required"
      });
    }

    // Get workspace from request context (set by requirePermission middleware)
    const workspace = req.workspace;
    
    if (!workspace) {
      return res.status(500).json({
        success: false,
        message: "Workspace context not found"
      });
    }

    // Check if user is the workspace owner
    const ownerId = workspace.owner.toString();
    
    if (userId !== ownerId) {
      return res.status(403).json({
        success: false,
        message: "Only workspace owners can perform this action"
      });
    }

    next();
  } catch (error: any) {
    console.error("[Owner Only Middleware] Error:", error);
    return res.status(500).json({
      success: false,
      message: "Error checking ownership"
    });
  }
};

module.exports = ownerOnly;
export default ownerOnly;
