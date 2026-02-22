import { Response, NextFunction } from "express";
import { AuthRequest } from "../types/express";

const asyncHandler = require("../utils/asyncHandler");
const { ListMember, ListPermissionLevel } = require("../models/ListMember");
const List = require("../models/List");
const Workspace = require("../models/Workspace");
const User = require("../models/User");
const AppError = require("../utils/AppError");

/**
 * @desc    Get all list members with their permission levels
 * @route   GET /api/lists/:listId/list-members
 * @access  Private (Member or higher)
 */
const getListMembers = asyncHandler(
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    console.log('[ListMemberController] getListMembers called', { listId: req.params.listId });
    
    const { listId } = req.params;

    const list = await List.findById(listId).populate("workspace");
    if (!list) {
      return next(new AppError("List not found", 404));
    }

    // Get all list members with overrides
    const listMembers = await ListMember.find({ list: listId })
      .populate("user", "name email avatar")
      .populate("addedBy", "name")
      .lean();

    // Get workspace to show all potential members
    const workspace = await Workspace.findById(list.workspace).populate(
      "members.user",
      "name email avatar"
    );

    // Format response with override info
    const members = workspace.members.map((member: any) => {
      const override = listMembers.find(
        (lm: any) => lm.user._id.toString() === member.user._id.toString()
      );

      return {
        _id: member.user._id,
        name: member.user.name,
        email: member.user.email,
        avatar: member.user.avatar,
        workspaceRole: member.role,
        listPermissionLevel: override?.permissionLevel || null,
        hasOverride: !!override,
        addedBy: override?.addedBy?.name || null,
        addedAt: override?.createdAt || null,
      };
    });

    console.log('[ListMemberController] Members retrieved', { count: members.length });

    res.status(200).json({
      success: true,
      count: members.length,
      data: members,
    });
  }
);

/**
 * @desc    Add or update list member permission override
 * @route   POST /api/lists/:listId/list-members
 * @access  Private (Admin or Owner)
 */
const addListMember = asyncHandler(
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    const { listId } = req.params;
    const { userId, permissionLevel } = req.body;
    const currentUserId = req.user!.id;

    console.log('[addListMember] Request:', { listId, userId, permissionLevel, currentUserId });

    // Validate permission level
    const validLevels = Object.values(ListPermissionLevel);
    if (!permissionLevel || !validLevels.includes(permissionLevel)) {
      return next(
        new AppError(
          `Invalid permission level. Must be one of: ${validLevels.join(", ")}`,
          400
        )
      );
    }

    if (!userId) {
      return next(new AppError("User ID is required", 400));
    }

    // Verify list exists
    const list = await List.findById(listId).populate('space').populate('workspace');
    if (!list) {
      return next(new AppError("List not found", 404));
    }

    console.log('[addListMember] List found:', { 
      listId: list._id, 
      space: list.space, 
      workspace: list.workspace,
      folder: list.folder 
    });

    // Verify list has required references
    if (!list.space) {
      console.error('[addListMember] List missing space reference:', { list });
      return next(new AppError("List is missing space reference", 500));
    }
    
    if (!list.workspace) {
      console.error('[addListMember] List missing workspace reference:', { list });
      return next(new AppError("List is missing workspace reference", 500));
    }

    // Verify user is workspace member
    const workspaceId = typeof list.workspace === 'object' ? list.workspace._id : list.workspace;
    const workspace = await Workspace.findById(workspaceId);
    if (!workspace) {
      return next(new AppError("Workspace not found", 404));
    }

    const isWorkspaceMember = workspace.members.some(
      (m: any) => m.user.toString() === userId
    );

    if (!isWorkspaceMember) {
      return next(
        new AppError("User must be a workspace member first", 400)
      );
    }

    // DO NOT auto-add user to space
    // Users can be list members without being space members
    // This allows granular access control at the list level

    // Check if override already exists
    let listMember = await ListMember.findOne({
      user: userId,
      list: listId,
    });

    if (listMember) {
      // Update existing override
      listMember.permissionLevel = permissionLevel;
      listMember.addedBy = currentUserId;
      await listMember.save();
    } else {
      // Create new override - ensure all required fields are present
      const spaceId = typeof list.space === 'object' ? list.space._id : list.space;
      const workspaceId = typeof list.workspace === 'object' ? list.workspace._id : list.workspace;
      
      if (!spaceId) {
        console.error('[addListMember] Missing space ID:', { list });
        return next(new AppError("List is missing space reference", 500));
      }
      
      if (!workspaceId) {
        console.error('[addListMember] Missing workspace ID:', { list });
        return next(new AppError("List is missing workspace reference", 500));
      }
      
      const createData = {
        user: userId,
        list: listId,
        space: spaceId,
        workspace: workspaceId,
        permissionLevel,
        addedBy: currentUserId,
      };
      
      // Only add folder if it exists
      if (list.folder) {
        const folderId = typeof list.folder === 'object' ? list.folder._id : list.folder;
        (createData as any).folder = folderId;
      }
      
      console.log('[addListMember] Creating with data:', createData);
      
      try {
        listMember = await ListMember.create(createData);
      } catch (createError: any) {
        console.error('[addListMember] Create error:', createError);
        return next(new AppError(`Failed to create list member: ${createError.message}`, 500));
      }
    }

    // Populate user info
    await listMember.populate("user", "name email avatar");

    res.status(200).json({
      success: true,
      message: "List member permission updated successfully",
      data: {
        _id: listMember.user._id,
        name: listMember.user.name,
        email: listMember.user.email,
        avatar: listMember.user.avatar,
        permissionLevel: listMember.permissionLevel,
      },
    });
  }
);

/**
 * @desc    Update list member permission level
 * @route   PATCH /api/lists/:listId/list-members/:userId
 * @access  Private (Admin or Owner)
 */
const updateListMember = asyncHandler(
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    const { listId, userId } = req.params;
    const { permissionLevel } = req.body;
    const currentUserId = req.user!.id;

    // Validate permission level
    const validLevels = Object.values(ListPermissionLevel);
    if (!permissionLevel || !validLevels.includes(permissionLevel)) {
      return next(
        new AppError(
          `Invalid permission level. Must be one of: ${validLevels.join(", ")}`,
          400
        )
      );
    }

    const listMember = await ListMember.findOne({
      user: userId,
      list: listId,
    });

    if (!listMember) {
      return next(
        new AppError("List member override not found", 404)
      );
    }

    listMember.permissionLevel = permissionLevel;
    listMember.addedBy = currentUserId;
    await listMember.save();

    await listMember.populate("user", "name email avatar");

    res.status(200).json({
      success: true,
      message: "List member permission updated successfully",
      data: {
        _id: listMember.user._id,
        name: listMember.user.name,
        email: listMember.user.email,
        avatar: listMember.user.avatar,
        permissionLevel: listMember.permissionLevel,
      },
    });
  }
);

/**
 * @desc    Remove list member permission override
 * @route   DELETE /api/lists/:listId/list-members/:userId
 * @access  Private (Admin or Owner)
 */
const removeListMember = asyncHandler(
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    const { listId, userId } = req.params;

    const listMember = await ListMember.findOneAndDelete({
      user: userId,
      list: listId,
    });

    if (!listMember) {
      return next(
        new AppError("List member override not found", 404)
      );
    }

    res.status(200).json({
      success: true,
      message: "List member permission override removed successfully",
    });
  }
);

module.exports = {
  getListMembers,
  addListMember,
  updateListMember,
  removeListMember,
};
export {};
