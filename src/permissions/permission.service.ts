/**
 * Permission Service
 * Centralized permission checking logic with hierarchical overrides
 * 
 * Resolution Order:
 * 1. Owner Bypass → Always has full access
 * 2. List Override → If listId provided, check ListMember
 * 3. Folder Override → If folderId provided (and no list override), check FolderMember
 * 4. Space Override → If spaceId provided (and no folder/list override), check SpaceMember
 * 5. Workspace Role → Fallback to workspace-level RBAC
 * 6. Task-Specific Rules → Assignee checks for certain actions
 */

import {
  WorkspaceRole,
  SpacePermissionLevel,
  FolderPermissionLevel,
  ListPermissionLevel,
  PermissionAction,
  PermissionContext
} from "./permission.types";
const { 
  roleHasPermission, 
  spacePermissionHasAction,
  folderPermissionHasAction,
  listPermissionHasAction
} = require("./permission.constants");

const Workspace = require("../models/Workspace");
const SpaceMember = require("../models/SpaceMember");
const FolderMember = require("../models/FolderMember");
const ListMember = require("../models/ListMember");
const Task = require("../models/Task");

class PermissionService {
  /**
   * Check if a user can perform an action
   * 
   * Resolution Order:
   * 1. If user is OWNER → return true (bypass all checks)
   * 2. If listId provided → check ListMember override
   * 3. If no list override and folderId provided → check FolderMember override
   * 4. If no folder override and spaceId provided → check SpaceMember override
   * 5. If no overrides → fallback to workspace role
   * 6. Apply task-specific rules (assignee check)
   * 
   * @param userId - User ID
   * @param action - Permission action to check
   * @param context - Context containing workspaceId and optional spaceId/folderId/listId
   * @returns Promise<boolean>
   */
  async can(
    userId: string,
    action: PermissionAction,
    context: PermissionContext
  ): Promise<boolean> {
    try {
      // Step 1: Check if user is workspace owner (bypass all checks)
      const isOwner = await this.isOwner(userId, context.workspaceId);
      if (isOwner) {
        return true;
      }

      // Step 2: Get user's workspace role
      const workspaceRole = await this.getUserRole(userId, context.workspaceId);
      
      if (!workspaceRole) {
        return false;
      }

      // Step 3: Check for list-level override (highest priority)
      if (context.listId) {
        const listPermission = await this.getListPermissionLevel(
          userId,
          context.listId
        );

        if (listPermission) {
          // List override exists - use it
          const hasListPermission = listPermissionHasAction(listPermission, action);
          
          if (!hasListPermission) {
            return false;
          }

          // Apply task-specific rules even with list override
          if (this.isTaskAction(action) && context.resourceType === "task") {
            return await this.checkTaskPermission(
              userId,
              action,
              context,
              workspaceRole
            );
          }

          return true;
        }
      }

      // Step 4: Check for folder-level override (second priority)
      if (context.folderId) {
        const folderPermission = await this.getFolderPermissionLevel(
          userId,
          context.folderId
        );

        if (folderPermission) {
          // Folder override exists - use it
          const hasFolderPermission = folderPermissionHasAction(folderPermission, action);
          
          if (!hasFolderPermission) {
            return false;
          }

          // Apply task-specific rules even with folder override
          if (this.isTaskAction(action) && context.resourceType === "task") {
            return await this.checkTaskPermission(
              userId,
              action,
              context,
              workspaceRole
            );
          }

          return true;
        }
      }

      // Step 5: Check for space-level override (third priority)
      if (context.spaceId) {
        const spacePermission = await this.getSpacePermissionLevel(
          userId,
          context.spaceId
        );

        if (spacePermission) {
          // Space override exists - use it
          const hasSpacePermission = spacePermissionHasAction(spacePermission, action);
          
          if (!hasSpacePermission) {
            return false;
          }

          // Apply task-specific rules even with space override
          if (this.isTaskAction(action) && context.resourceType === "task") {
            return await this.checkTaskPermission(
              userId,
              action,
              context,
              workspaceRole
            );
          }

          return true;
        }
        
        // No space override - check if user is space member for space-related actions
        // Members must be added to space to perform actions beyond viewing
        if (this.isSpaceAction(action) && workspaceRole === WorkspaceRole.MEMBER) {
          const isSpaceMember = await this.isSpaceMember(userId, context.spaceId);
          if (!isSpaceMember) {
            // Members not in space can only view
            const viewActions: PermissionAction[] = ["VIEW_SPACE", "VIEW_FOLDER", "VIEW_LIST", "VIEW_TASK", "COMMENT_TASK"];
            return viewActions.includes(action);
          }
        }
      }

      // Step 6: No overrides - use workspace role
      const hasWorkspacePermission = roleHasPermission(workspaceRole, action);
      
      if (!hasWorkspacePermission) {
        return false;
      }

      // Step 7: Apply task-specific rules
      if (this.isTaskAction(action) && context.resourceType === "task") {
        return await this.checkTaskPermission(
          userId,
          action,
          context,
          workspaceRole
        );
      }

      return true;
    } catch (error) {
      console.error("[PermissionService] Error checking permission:", error);
      return false;
    }
  }

  /**
   * Get user's role in a workspace
   * @param userId - User ID
   * @param workspaceId - Workspace ID
   * @returns Promise<WorkspaceRole | null>
   */
  async getUserRole(
    userId: string,
    workspaceId: string
  ): Promise<WorkspaceRole | null> {
    try {
      const workspace = await Workspace.findById(workspaceId).select(
        "owner members"
      );

      if (!workspace) {
        return null;
      }

      // Check if user is owner
      if (workspace.owner.toString() === userId) {
        return WorkspaceRole.OWNER;
      }

      // Find user in members
      const member = workspace.members.find(
        (m: any) => m.user.toString() === userId
      );

      if (!member) {
        return null;
      }

      // Convert lowercase role to uppercase enum
      return this.normalizeRole(member.role);
    } catch (error) {
      console.error("[PermissionService] Error getting user role:", error);
      return null;
    }
  }

  /**
   * Get user's space permission level (override)
   * @param userId - User ID
   * @param spaceId - Space ID
   * @returns Promise<SpacePermissionLevel | null>
   */
  async getSpacePermissionLevel(
    userId: string,
    spaceId: string
  ): Promise<SpacePermissionLevel | null> {
    try {
      const spaceMember = await SpaceMember.findOne({
        user: userId,
        space: spaceId
      }).select("permissionLevel");

      if (!spaceMember) {
        return null;
      }

      return spaceMember.permissionLevel;
    } catch (error) {
      console.error("[PermissionService] Error getting space permission:", error);
      return null;
    }
  }

  /**
   * Get user's folder permission level (override)
   * @param userId - User ID
   * @param folderId - Folder ID
   * @returns Promise<FolderPermissionLevel | null>
   */
  async getFolderPermissionLevel(
    userId: string,
    folderId: string
  ): Promise<FolderPermissionLevel | null> {
    try {
      const folderMember = await FolderMember.findOne({
        user: userId,
        folder: folderId
      }).select("permissionLevel");

      if (!folderMember) {
        return null;
      }

      return folderMember.permissionLevel;
    } catch (error) {
      console.error("[PermissionService] Error getting folder permission:", error);
      return null;
    }
  }

  /**
   * Get user's list permission level (override)
   * @param userId - User ID
   * @param listId - List ID
   * @returns Promise<ListPermissionLevel | null>
   */
  async getListPermissionLevel(
    userId: string,
    listId: string
  ): Promise<ListPermissionLevel | null> {
    try {
      const listMember = await ListMember.findOne({
        user: userId,
        list: listId
      }).select("permissionLevel");

      if (!listMember) {
        return null;
      }

      return listMember.permissionLevel;
    } catch (error) {
      console.error("[PermissionService] Error getting list permission:", error);
      return null;
    }
  }

  /**
   * Check if user is workspace member
   * @param userId - User ID
   * @param workspaceId - Workspace ID
   * @returns Promise<boolean>
   */
  async isMember(userId: string, workspaceId: string): Promise<boolean> {
    const role = await this.getUserRole(userId, workspaceId);
    return role !== null;
  }

  /**
   * Check if user is workspace owner
   * @param userId - User ID
   * @param workspaceId - Workspace ID
   * @returns Promise<boolean>
   */
  async isOwner(userId: string, workspaceId: string): Promise<boolean> {
    try {
      const workspace = await Workspace.findById(workspaceId).select("owner");
      if (!workspace) {
        return false;
      }
      return workspace.owner.toString() === userId;
    } catch (error) {
      return false;
    }
  }

  /**
   * Check if user is admin or owner
   * @param userId - User ID
   * @param workspaceId - Workspace ID
   * @returns Promise<boolean>
   */
  async isAdminOrOwner(userId: string, workspaceId: string): Promise<boolean> {
    const role = await this.getUserRole(userId, workspaceId);
    return role === WorkspaceRole.ADMIN || role === WorkspaceRole.OWNER;
  }

  /**
   * Check task-specific permissions
   * Members can edit/change status of tasks they're assigned to
   */
  async checkTaskPermission(
    userId: string,
    action: PermissionAction,
    context: PermissionContext,
    role: WorkspaceRole
  ): Promise<boolean> {
    // Admins and owners can do anything
    if (role === WorkspaceRole.ADMIN || role === WorkspaceRole.OWNER) {
      return true;
    }

    // For EDIT_TASK and CHANGE_STATUS, check if user is assignee
    if (action === "EDIT_TASK" || action === "CHANGE_STATUS") {
      if (!context.resourceId) {
        return false;
      }

      const task = await Task.findById(context.resourceId).select("assignee");
      
      if (!task) {
        return false;
      }

      // Allow if user is the assignee
      if (task.assignee && task.assignee.toString() === userId) {
        return true;
      }

      return false;
    }

    return true;
  }

  /**
   * Check if action is task-related
   */
  isTaskAction(action: PermissionAction): boolean {
    const taskActions: PermissionAction[] = [
      "CREATE_TASK",
      "DELETE_TASK",
      "EDIT_TASK",
      "VIEW_TASK",
      "ASSIGN_TASK",
      "CHANGE_STATUS",
      "COMMENT_TASK",
    ];
    return taskActions.includes(action);
  }

  /**
   * Check if action is space-related (requires space membership for members)
   */
  isSpaceAction(action: PermissionAction): boolean {
    const spaceActions: PermissionAction[] = [
      "CREATE_FOLDER",
      "DELETE_FOLDER",
      "UPDATE_FOLDER",
      "CREATE_LIST",
      "DELETE_LIST",
      "UPDATE_LIST",
      "CREATE_TASK",
      "DELETE_TASK",
      "EDIT_TASK",
      "ASSIGN_TASK",
      "CHANGE_STATUS",
    ];
    return spaceActions.includes(action);
  }

  /**
   * Check if user is a member of a space
   * @param userId - User ID
   * @param spaceId - Space ID
   * @returns Promise<boolean>
   */
  async isSpaceMember(userId: string, spaceId: string): Promise<boolean> {
    try {
      const Space = require("../models/Space");
      const space = await Space.findById(spaceId).select("members");
      
      if (!space) {
        return false;
      }

      return space.members.some((member: any) => {
        const memberId = typeof member.user === 'string' ? member.user : member.user?.toString();
        return memberId === userId;
      });
    } catch (error) {
      console.error("[PermissionService] Error checking space membership:", error);
      return false;
    }
  }

  /**
   * Normalize role string to WorkspaceRole enum
   */
  normalizeRole(role: string): WorkspaceRole {
    const roleUpper = role.toUpperCase();
    
    if (roleUpper === "OWNER") return WorkspaceRole.OWNER;
    if (roleUpper === "ADMIN") return WorkspaceRole.ADMIN;
    if (roleUpper === "MEMBER") return WorkspaceRole.MEMBER;
    if (roleUpper === "GUEST") return WorkspaceRole.GUEST;
    
    // Default to GUEST if unknown
    return WorkspaceRole.GUEST;
  }
}

module.exports = new PermissionService();

export {};
