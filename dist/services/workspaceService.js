"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const Workspace = require("../models/Workspace");
const AppError = require("../utils/AppError");
const softDelete = require("../utils/softDelete");
const logger = require("../utils/logger");
class WorkspaceService {
    async createWorkspace(data) {
        const workspace = await Workspace.create({
            name: data.name,
            owner: data.owner,
            members: [
                {
                    user: data.owner,
                    role: "owner",
                    status: "inactive" // Owner starts clocked out by default
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
    async getUserWorkspaces(userId) {
        const workspaces = await Workspace.find({
            isDeleted: false,
            $or: [{ owner: userId }, { "members.user": userId }]
        })
            .populate({
            path: "owner",
            select: "name email avatar subscription",
            populate: {
                path: "subscription.planId",
                model: "Plan"
            }
        })
            .populate("members.user", "name email avatar")
            .sort("-createdAt");
        // Transform workspaces to include subscription at workspace level
        return workspaces.map((workspace) => {
            const workspaceObj = workspace.toObject();
            if (workspaceObj.owner && workspaceObj.owner.subscription) {
                workspaceObj.subscription = {
                    isPaid: workspaceObj.owner.subscription.isPaid,
                    status: workspaceObj.owner.subscription.status,
                    plan: workspaceObj.owner.subscription.planId
                };
            }
            return workspaceObj;
        });
    }
    async getWorkspaceById(workspaceId, userId) {
        const workspace = await Workspace.findOne({
            _id: workspaceId,
            isDeleted: false
        })
            .populate({
            path: "owner",
            select: "name email avatar subscription",
            populate: {
                path: "subscription.planId",
                model: "Plan"
            }
        })
            .populate("members.user", "name email avatar");
        if (!workspace) {
            throw new AppError("Workspace not found", 404);
        }
        const hasAccess = workspace.owner._id.toString() === userId ||
            workspace.members.some((member) => member.user._id.toString() === userId);
        if (!hasAccess) {
            throw new AppError("You do not have access to this workspace", 403);
        }
        // Transform the response to include subscription at workspace level for easier access
        const workspaceObj = workspace.toObject();
        if (workspaceObj.owner && workspaceObj.owner.subscription) {
            workspaceObj.subscription = {
                isPaid: workspaceObj.owner.subscription.isPaid,
                status: workspaceObj.owner.subscription.status,
                plan: workspaceObj.owner.subscription.planId
            };
        }
        return workspaceObj;
    }
    async deleteWorkspace(workspaceId, userId) {
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
    async updateWorkspace(workspaceId, userId, updateData) {
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
    async getWorkspaceAnalytics(workspaceId, userId) {
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
        const hasAccess = workspace.owner._id.toString() === userId ||
            workspace.members.some((member) => member.user._id.toString() === userId);
        if (!hasAccess) {
            throw new AppError("You do not have access to this workspace", 403);
        }
        // 3. Fetch Data Tree (Spaces -> Lists -> Tasks)
        const spaces = await Space.find({ workspace: workspaceId, isDeleted: false })
            .select("_id name color status")
            .lean();
        const spaceIds = spaces.map((s) => s._id);
        const lists = await List.find({ space: { $in: spaceIds }, isDeleted: false })
            .select("_id space")
            .lean();
        const listIds = lists.map((l) => l._id);
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
    async updateMemberCustomRole(workspaceId, memberId, customRoleTitle) {
        const workspace = await Workspace.findOne({
            _id: workspaceId,
            isDeleted: false
        });
        if (!workspace) {
            throw new AppError("Workspace not found", 404);
        }
        // Find the member in the workspace
        const member = workspace.members.find((m) => m.user.toString() === memberId);
        if (!member) {
            throw new AppError("Member not found in this workspace", 404);
        }
        // Update the custom role title
        member.customRoleTitle = customRoleTitle;
        await workspace.save();
        // Populate the member user data for the response
        await workspace.populate("members.user", "name email avatar");
        // Find and return the updated member
        const updatedMember = workspace.members.find((m) => m.user._id.toString() === memberId);
        return updatedMember;
    }
}
module.exports = new WorkspaceService();
