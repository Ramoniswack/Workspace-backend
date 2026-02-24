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
          role: "owner",
          status: "inactive" // Initialize status
        }
      ]
    });

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
      .populate("owner", "name email avatar")
      .populate("members.user", "name email avatar")
      .sort("-createdAt");

    return workspaces;
  }

  async getWorkspaceById(workspaceId: string, userId: string) {
    const workspace = await Workspace.findOne({
      _id: workspaceId,
      isDeleted: false
    })
      .populate("owner", "name email avatar")
      .populate("members.user", "name email avatar");

    if (!workspace) {
      throw new AppError("Workspace not found", 404);
    }

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

    if (workspace.owner.toString() !== userId) {
      throw new AppError("Only workspace owner can delete this workspace", 403);
    }

    await softDelete(Workspace, workspaceId);

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

    if (workspace.owner.toString() !== userId) {
      throw new AppError("Only workspace owner can update this workspace", 403);
    }

    const oldValue = workspace.toObject();

    if (updateData.name) {
      workspace.name = updateData.name;
    }

    await workspace.save();

    await logger.logAudit({
      userId,
      workspaceId: workspace._id.toString(),
      resourceType: "Workspace",
      resourceId: workspace._id.toString(),
      oldValue,
      newValue: workspace.toObject()
    });

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
    // Dynamic requires to prevent circular dependencies
    const Space = require("../models/Space");
    const List = require("../models/List");
    const Task = require("../models/Task");
    const TimeEntry = require("../models/TimeEntry");

    // 1. Fetch Workspace & Members (populated for UI badges/avatars)
    const workspace = await Workspace.findOne({
      _id: workspaceId,
      isDeleted: false
    })
      .populate("owner", "name email avatar")
      .populate("members.user", "name email avatar")
      .lean();

    if (!workspace) {
      throw new AppError("Workspace not found", 404);
    }

    // 2. Security Check
    const hasAccess =
      workspace.owner._id.toString() === userId ||
      workspace.members.some((member: any) => member.user._id.toString() === userId);

    if (!hasAccess) {
      throw new AppError("You do not have access to this workspace", 403);
    }

    // 3. Fetch Data Tree (Spaces -> Lists -> Tasks)
    const spaces = await Space.find({ workspace: workspaceId, isDeleted: false })
      .select("_id name color status")
      .lean();

    const spaceIds = spaces.map((s: any) => s._id);

    const lists = await List.find({ space: { $in: spaceIds }, isDeleted: false })
      .select("_id space")
      .lean();

    const listIds = lists.map((l: any) => l._id);

    const tasks = await Task.find({ list: { $in: listIds }, isDeleted: false })
      .select("_id name status priority assignee space list workspace createdAt updatedAt")
      .populate("assignee", "name email avatar")
      .lean();

    // 4. Fetch the specific running timer for the current user
    // This allows the frontend to calculate the "ticking" seconds on refresh
    const currentRunningTimer = await TimeEntry.findOne({
      user: userId,
      workspace: workspaceId,
      isRunning: true,
      isDeleted: false
    })
      .select("_id startTime isRunning description")
      .sort("-startTime") // Get the most recent one if duplicates exist
      .lean();

    return {
      workspace,
      spaces,
      tasks,
      members: workspace.members,
      currentRunningTimer // Crucial for persistence
    };
  }
}

module.exports = new WorkspaceService();

export {};