const Plan = require('../models/Plan');

interface IPlanFeatures {
    maxWorkspaces: number;
    maxMembers: number;
    maxAdmins: number;
    maxSpaces: number;
    maxLists: number;
    maxFolders: number;
    maxTasks: number;
    hasAccessControl: boolean;
    hasGroupChat: boolean;
    messageLimit: number;
    announcementCooldown: number;
    accessControlTier: 'none' | 'basic' | 'pro' | 'advanced';
    canUseCustomRoles: boolean;
    maxCustomRoles: number;
    canCreateTables: boolean;
    maxTablesCount: number;
    maxRowsLimit: number;
    maxColumnsLimit: number;
}

/**
 * PlanInheritanceService
 * Handles plan feature inheritance and resolution
 */
class PlanInheritanceService {
    /**
     * Resolve plan features including inheritance from parent plans
     * @param plan - The plan to resolve features for
     * @returns Resolved features with inheritance applied
     */
    async resolveFeatures(plan: any): Promise<IPlanFeatures> {
        try {
            if (!plan) {
                throw new Error('Plan is required');
            }

            // Base case: no parent plan
            if (!plan.parentPlanId) {
                return plan.features;
            }

            // Get parent plan
            const parentPlan = await Plan.findById(plan.parentPlanId);
            if (!parentPlan) {
                // Parent not found, return features as-is
                console.warn(`[PlanInheritanceService] Parent plan ${plan.parentPlanId} not found for plan ${plan._id}`);
                return plan.features;
            }

            // Recursively resolve parent features
            const parentFeatures = await this.resolveFeatures(parentPlan);

            // Merge features (child overrides parent)
            return this.mergeFeatures(parentFeatures, plan.features);
        } catch (error) {
            console.error(`[PlanInheritanceService] Error resolving plan features:`, error);
            throw error;
        }
    }

    /**
     * Merge parent and child features
     * Child features override parent features
     * For boolean features: child OR parent (if either is true, result is true)
     * For numeric limits: take the maximum value (-1 means unlimited)
     * For tier features: take the higher tier
     * 
     * @param parentFeatures - Features from parent plan
     * @param childFeatures - Features from child plan
     * @returns Merged features
     */
    private mergeFeatures(
        parentFeatures: IPlanFeatures,
        childFeatures: IPlanFeatures
    ): IPlanFeatures {
        return {
            // Numeric limits: use maxValue helper
            maxWorkspaces: this.maxValue(parentFeatures.maxWorkspaces, childFeatures.maxWorkspaces),
            maxMembers: this.maxValue(parentFeatures.maxMembers, childFeatures.maxMembers),
            maxAdmins: this.maxValue(parentFeatures.maxAdmins, childFeatures.maxAdmins),
            maxSpaces: this.maxValue(parentFeatures.maxSpaces, childFeatures.maxSpaces),
            maxLists: this.maxValue(parentFeatures.maxLists, childFeatures.maxLists),
            maxFolders: this.maxValue(parentFeatures.maxFolders, childFeatures.maxFolders),
            maxTasks: this.maxValue(parentFeatures.maxTasks, childFeatures.maxTasks),
            messageLimit: this.maxValue(parentFeatures.messageLimit, childFeatures.messageLimit),
            maxCustomRoles: this.maxValue(parentFeatures.maxCustomRoles || -1, childFeatures.maxCustomRoles || -1),
            maxTablesCount: this.maxValue(parentFeatures.maxTablesCount || -1, childFeatures.maxTablesCount || -1),
            maxRowsLimit: this.maxValue(parentFeatures.maxRowsLimit || -1, childFeatures.maxRowsLimit || -1),
            maxColumnsLimit: this.maxValue(parentFeatures.maxColumnsLimit || -1, childFeatures.maxColumnsLimit || -1),

            // Boolean features: OR logic (if either is true, result is true)
            hasAccessControl: parentFeatures.hasAccessControl || childFeatures.hasAccessControl,
            hasGroupChat: parentFeatures.hasGroupChat || childFeatures.hasGroupChat,
            canUseCustomRoles: parentFeatures.canUseCustomRoles || childFeatures.canUseCustomRoles,
            canCreateTables: parentFeatures.canCreateTables || childFeatures.canCreateTables,

            // Announcement cooldown: use minimum (shorter cooldown is better)
            announcementCooldown: Math.min(
                parentFeatures.announcementCooldown,
                childFeatures.announcementCooldown
            ),

            // Tier features: use maxTier helper
            accessControlTier: this.maxTier(
                parentFeatures.accessControlTier,
                childFeatures.accessControlTier
            )
        };
    }

    /**
     * Get maximum value between two numbers
     * -1 means unlimited, which is always the maximum
     * 
     * @param a - First value
     * @param b - Second value
     * @returns Maximum value
     */
    private maxValue(a: number, b: number): number {
        if (a === -1 || b === -1) {
            return -1; // Unlimited
        }
        return Math.max(a, b);
    }

    /**
     * Get maximum access control tier
     * Tier order: none < basic < pro < advanced
     * 
     * @param a - First tier
     * @param b - Second tier
     * @returns Higher tier
     */
    private maxTier(
        a: 'none' | 'basic' | 'pro' | 'advanced',
        b: 'none' | 'basic' | 'pro' | 'advanced'
    ): 'none' | 'basic' | 'pro' | 'advanced' {
        const tierOrder: Record<string, number> = {
            none: 0,
            basic: 1,
            pro: 2,
            advanced: 3
        };

        return tierOrder[a] > tierOrder[b] ? a : b;
    }
}

export default new PlanInheritanceService();
