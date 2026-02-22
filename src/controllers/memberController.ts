import { Response, NextFunction } from "express";
import { AuthRequest } from "../types/express";

const asyncHandler = require("../utils/asyncHandler");
const Workspace = require("../models/Workspace");
const User = require("../models/User");
const AppError = require("../utils/AppError");

/**
 * @desc    Get all members of a workspace
 * @route   GET /api/workspaces/:workspaceId/members
 * @access  Private (Member or higher)
 */
const getWorkspaceMembers = asyncHandler(
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    console.log('[MemberController] getWorkspaceMembers called', { workspaceId: req.params.workspaceId });
    
    const { workspaceId } = req.params;

    const workspace = await Workspace.findById(workspaceId).populate(
      "members.user",
      "name email"
    );

    if (!workspace) {
      return next(new AppError("Workspace not found", 404));
    }

    // Format response
    const members = workspace.members.map((member: any) => ({
      _id: member.user._id,
      name: member.user.name,
      email: member.user.email,
      role: member.role,
      isOwner: workspace.owner.toString() === member.user._id.toString(),
    }));

    console.log('[MemberController] Members retrieved', { count: members.length });

    res.status(200).json({
      success: true,
      count: members.length,
      data: members,
    });
  }
);

/**
 * @desc    Update member role
 * @route   PATCH /api/workspaces/:workspaceId/members/:userId
 * @access  Private (Owner only for role changes)
 */
const updateMemberRole = asyncHandler(
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    const { workspaceId, userId } = req.params;
    const { role } = req.body;
    const currentUserId = req.user!.id;

    // Validate role
    const validRoles = ["owner", "admin", "member", "guest"];
    if (!role || !validRoles.includes(role)) {
      return next(
        new AppError(
          `Invalid role. Must be one of: ${validRoles.join(", ")}`,
          400
        )
      );
    }

    const workspace = await Workspace.findById(workspaceId);
    if (!workspace) {
      return next(new AppError("Workspace not found", 404));
    }

    // Find the member to update
    const memberIndex = workspace.members.findIndex(
      (m: any) => m.user.toString() === userId
    );

    if (memberIndex === -1) {
      return next(new AppError("Member not found in workspace", 404));
    }

    // Check if trying to change owner role
    if (workspace.owner.toString() === userId && role !== "owner") {
      return next(
        new AppError(
          "Cannot change owner role. Transfer ownership first.",
          400
        )
      );
    }

    // Check if trying to make someone else owner
    if (role === "owner" && workspace.owner.toString() !== userId) {
      return next(
        new AppError(
          "Cannot assign owner role. Use transfer ownership endpoint.",
          400
        )
      );
    }

    // Prevent users from changing their own role
    if (userId === currentUserId) {
      return next(new AppError("Cannot change your own role", 400));
    }

    // Update the role
    workspace.members[memberIndex].role = role;
    await workspace.save();

    // Get updated member info
    const updatedWorkspace = await Workspace.findById(workspaceId).populate(
      "members.user",
      "name email"
    );

    const updatedMember = updatedWorkspace.members.find(
      (m: any) => m.user._id.toString() === userId
    );

    res.status(200).json({
      success: true,
      message: "Member role updated successfully",
      data: {
        _id: updatedMember.user._id,
        name: updatedMember.user.name,
        email: updatedMember.user.email,
        role: updatedMember.role,
        isOwner: workspace.owner.toString() === updatedMember.user._id.toString(),
      },
    });
  }
);

/**
 * @desc    Remove member from workspace
 * @route   DELETE /api/workspaces/:workspaceId/members/:userId
 * @access  Private (Admin or Owner)
 */
const removeMember = asyncHandler(
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    const { workspaceId, userId } = req.params;
    const currentUserId = req.user!.id;

    const workspace = await Workspace.findById(workspaceId);
    if (!workspace) {
      return next(new AppError("Workspace not found", 404));
    }

    // Cannot remove owner
    if (workspace.owner.toString() === userId) {
      return next(
        new AppError("Cannot remove workspace owner. Transfer ownership first.", 400)
      );
    }

    // Cannot remove yourself
    if (userId === currentUserId) {
      return next(new AppError("Cannot remove yourself. Use leave workspace instead.", 400));
    }

    // Find and remove member
    const memberIndex = workspace.members.findIndex(
      (m: any) => m.user.toString() === userId
    );

    if (memberIndex === -1) {
      return next(new AppError("Member not found in workspace", 404));
    }

    workspace.members.splice(memberIndex, 1);
    await workspace.save();

    res.status(200).json({
      success: true,
      message: "Member removed successfully",
    });
  }
);

/**
 * @desc    Invite member to workspace
 * @route   POST /api/workspaces/:workspaceId/members/invite
 * @access  Private (Admin or Owner)
 */
const inviteMember = asyncHandler(
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    const { workspaceId } = req.params;
    const { email, role = "member" } = req.body;

    if (!email) {
      return next(new AppError("Email is required", 400));
    }

    // Validate role
    const validRoles = ["admin", "member", "guest"];
    if (!validRoles.includes(role)) {
      return next(
        new AppError(
          `Invalid role. Must be one of: ${validRoles.join(", ")}`,
          400
        )
      );
    }

    const workspace = await Workspace.findById(workspaceId);
    if (!workspace) {
      return next(new AppError("Workspace not found", 404));
    }

    // Find user by email
    const user = await User.findOne({ email });
    if (!user) {
      return next(new AppError("User not found with that email", 404));
    }

    // Check if already a member
    const existingMember = workspace.members.find(
      (m: any) => m.user.toString() === user._id.toString()
    );

    if (existingMember) {
      return next(new AppError("User is already a member of this workspace", 400));
    }

    // Add member
    workspace.members.push({
      user: user._id,
      role: role,
    });

    await workspace.save();

    res.status(200).json({
      success: true,
      message: "Member invited successfully",
      data: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: role,
        isOwner: false,
      },
    });
  }
);

module.exports = {
  getWorkspaceMembers,
  updateMemberRole,
  removeMember,
  inviteMember,
};

export {};
