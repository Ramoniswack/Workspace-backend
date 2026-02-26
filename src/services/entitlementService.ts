import mongoose from 'mongoose';

const Workspace = require('../models/Workspace');
const Space = require('../models/Space');
const List = require('../models/List');
const Folder = require('../models/Folder');
const Task = require('../models/Task');

interface TotalUsage {
    totalWorkspaces: number;
    totalSpaces: number;
    totalLists: number;
    totalFolders: number;
    totalTasks: number;
}

/**
 * EntitlementService
 * Calculates global usage across all workspaces owned by a user
 */
class EntitlementService {
    /**
     * Get total usage across all workspaces owned by a user
     * @param ownerId - The owner's user ID
     * @returns Total usage counts
     */
    async getTotalUsage(ownerId: string): Promise<TotalUsage> {
        try {
            console.log(`[EntitlementService] Calculating total usage for owner: ${ownerId}`);

            // Get all workspaces owned by this user (not deleted)
            const workspaces = await Workspace.find({
                owner: ownerId,
                isDeleted: false
            }).select('_id').lean();

            const workspaceIds = workspaces.map((w: any) => w._id);
            const totalWorkspaces = workspaces.length;

            console.log(`[EntitlementService] Found ${totalWorkspaces} workspaces for owner ${ownerId}`);

            // If no workspaces, return zeros
            if (totalWorkspaces === 0) {
                return {
                    totalWorkspaces: 0,
                    totalSpaces: 0,
                    totalLists: 0,
                    totalFolders: 0,
                    totalTasks: 0
                };
            }

            // Count spaces across all workspaces
            const totalSpaces = await Space.countDocuments({
                workspace: { $in: workspaceIds },
                isDeleted: false
            });

            // Get all space IDs for these workspaces
            const spaces = await Space.find({
                workspace: { $in: workspaceIds },
                isDeleted: false
            }).select('_id').lean();
            const spaceIds = spaces.map((s: any) => s._id);

            // Count lists across all workspaces
            const totalLists = await List.countDocuments({
                workspace: { $in: workspaceIds },
                isDeleted: false
            });

            // Count folders across all spaces (folders are linked to spaces, not workspaces)
            const totalFolders = await Folder.countDocuments({
                spaceId: { $in: spaceIds },
                isDeleted: false
            });

            // Count tasks across all workspaces
            const totalTasks = await Task.countDocuments({
                workspace: { $in: workspaceIds },
                isDeleted: false
            });

            const usage: TotalUsage = {
                totalWorkspaces,
                totalSpaces,
                totalLists,
                totalFolders,
                totalTasks
            };

            console.log(`[EntitlementService] Total usage for owner ${ownerId}:`, usage);

            return usage;
        } catch (error) {
            console.error(`[EntitlementService] Error calculating total usage:`, error);
            throw error;
        }
    }

    /**
     * Get workspace owner's ID
     * @param workspaceId - The workspace ID
     * @returns Owner's user ID
     */
    async getWorkspaceOwner(workspaceId: string): Promise<string> {
        try {
            const workspace = await Workspace.findById(workspaceId).select('owner').lean();
            if (!workspace) {
                throw new Error('Workspace not found');
            }
            return workspace.owner.toString();
        } catch (error) {
            console.error(`[EntitlementService] Error getting workspace owner:`, error);
            throw error;
        }
    }
}

export default new EntitlementService();
