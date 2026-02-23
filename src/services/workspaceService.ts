const Workspace = require("../models/Workspace");
const AppError = require("../utils/AppError");
const softDelete = require("../utils/softDelete");
const logger = require("../utils/logger");

interface CreateWorkspaceData {
  name: string;
  owner: string;
}

class WorkspaceService {
  async createWorkspace(data: CreateWorkspaceData) {
    const workspace = await Workspace.create({
      name: data.name,
      owner: data.owner,
      members: [
        {
          user: data.owner,
          role: "owner"
        }
      ]
    });

    // Log activity
    await logger.logActivity({
      userId: data.owner,
      workspaceId: workspace._id.toString(),
      action: "CREATE",
      resourceType: "Workspace",
      resourceId: workspace._id.toString(),
      metadata: { name: workspace.name }
    });

    return workspace;
  }

  async getUserWorkspaces(userId: string) {
    const workspaces = await Workspace.find({
      isDeleted: false,
      $or: [{ owner: userId }, { "members.user": userId }]
    })
      .populate("owner", "name email")
      .populate("members.user", "name email")
      .sort("-createdAt");

    return workspaces;
  }

  async getWorkspaceById(workspaceId: string, userId: string) {
    const workspace = await Workspace.findOne({
      _id: workspaceId,
      isDeleted: false
    })
      .populate("owner", "name email")
      .populate("members.user", "name email");

    if (!workspace) {
      throw new AppError("Workspace not found", 404);
    }

    // Check if user has access
    const hasAccess =
      workspace.owner._id.toString() === userId ||
      workspace.members.some((member: any) => member.user._id.toString() === userId);

    if (!hasAccess) {
      throw new AppError("You do not have access to this workspace", 403);
    }

    return workspace;
  }

  async deleteWorkspace(workspaceId: string, userId: string) {
    const workspace = await Workspace.findOne({
      _id: workspaceId,
      isDeleted: false
    });

    if (!workspace) {
      throw new AppError("Workspace not found", 404);
    }

    // Only owner can delete
    if (workspace.owner.toString() !== userId) {
      throw new AppError("Only workspace owner can delete this workspace", 403);
    }

    await softDelete(Workspace, workspaceId);

    // Log activity
    await logger.logActivity({
      userId,
      workspaceId: workspace._id.toString(),
      action: "DELETE",
      resourceType: "Workspace",
      resourceId: workspace._id.toString()
    });

    return { message: "Workspace deleted successfully" };
  }

  async updateWorkspace(workspaceId: string, userId: string, updateData: { name?: string }) {
    const workspace = await Workspace.findOne({
      _id: workspaceId,
      isDeleted: false
    });

    if (!workspace) {
      throw new AppError("Workspace not found", 404);
    }

    // Only owner can update
    if (workspace.owner.toString() !== userId) {
      throw new AppError("Only workspace owner can update this workspace", 403);
    }

    // Capture old state for audit
    const oldValue = workspace.toObject();

    if (updateData.name) {
      workspace.name = updateData.name;
    }

    await workspace.save();

    // Log audit
    await logger.logAudit({
      userId,
      workspaceId: workspace._id.toString(),
      resourceType: "Workspace",
      resourceId: workspace._id.toString(),
      oldValue,
      newValue: workspace.toObject()
    });

    // Log activity
    await logger.logActivity({
      userId,
      workspaceId: workspace._id.toString(),
      action: "UPDATE",
      resourceType: "Workspace",
      resourceId: workspace._id.toString()
    });

    return workspace;
  }

  async getWorkspaceAnalytics(workspaceId: string, userId: string) {
    const Space = require("../models/Space");
    const List = require("../models/List");
    const Task = require("../models/Task");

    // Verify workspace access
    const workspace = await Workspace.findOne({
      _id: workspaceId,
      isDeleted: false
    })
      .populate("owner", "name email")
      .populate("members.user", "name email");

    if (!workspace) {
      throw new AppError("Workspace not found", 404);
    }

    const hasAccess =
      workspace.owner._id.toString() === userId ||
      workspace.members.some((member: any) => member.user._id.toString() === userId);

    if (!hasAccess) {
      throw new AppError("You do not have access to this workspace", 403);
    }

    // Fetch all spaces
    const spaces = await Space.find({
      workspace: workspaceId,
      isDeleted: false
    })
      .select("_id name color status")
      .lean();

    const spaceIds = spaces.map((s: any) => s._id);

    // Fetch all lists
    const lists = await List.find({
      space: { $in: spaceIds },
      isDeleted: false
    })
      .select("_id space")
      .lean();

    const listIds = lists.map((l: any) => l._id);

    // Fetch all tasks in one query
    const tasks = await Task.find({
      list: { $in: listIds },
      isDeleted: false
    })
      .select("_id name status priority assignee space list workspace createdAt updatedAt")
      .populate("assignee", "name email")
      .lean();

    return {
      workspace,
      spaces,
      tasks,
      members: workspace.members
    };
  }
}

module.exports = new WorkspaceService();

export {};
