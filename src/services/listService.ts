const List = require("../models/List");
const Space = require("../models/Space");
const AppError = require("../utils/AppError");
const softDelete = require("../utils/softDelete");
const logger = require("../utils/logger");

interface CreateListData {
  name: string;
  space: string;
  createdBy: string;
  folderId?: string;
}

interface UpdateListData {
  name?: string;
  folderId?: string | null;
}

class ListService {
  async createList(data: CreateListData) {
    const { name, space: spaceId, createdBy, folderId } = data;

    // Verify space exists
    const space = await Space.findOne({
      _id: spaceId,
      isDeleted: false
    });

    if (!space) {
      throw new AppError("Space not found", 404);
    }

    // Verify user is workspace member (not just space member)
    const Workspace = require("../models/Workspace");
    const workspace = await Workspace.findOne({
      _id: space.workspace,
      isDeleted: false
    });

    if (!workspace) {
      throw new AppError("Workspace not found", 404);
    }

    const isWorkspaceMember = workspace.members.some(
      (member: any) => member.user.toString() === createdBy
    );

    if (!isWorkspaceMember) {
      throw new AppError("You must be a workspace member to create a list", 403);
    }

    // Create list
    const list = await List.create({
      name,
      space: spaceId,
      workspace: space.workspace,
      createdBy,
      folderId: folderId || null
    });

    // Log activity
    await logger.logActivity({
      userId: createdBy,
      workspaceId: space.workspace.toString(),
      action: "CREATE",
      resourceType: "List",
      resourceId: list._id.toString(),
      metadata: { name: list.name, spaceId, folderId }
    });

    return list;
  }

  async getSpaceLists(spaceId: string, userId: string) {
    console.log(`[ListService] getSpaceLists called with spaceId: ${spaceId}, userId: ${userId}`);
    
    // Import ListMember model
    const ListMember = require("../models/ListMember").ListMember;
    
    // Verify space exists
    const space = await Space.findOne({
      _id: spaceId,
      isDeleted: false
    }).populate('workspace');

    if (!space) {
      console.error(`[ListService] Space not found with ID: ${spaceId}`);
      throw new AppError("Space not found", 404);
    }

    console.log(`[ListService] Found space: ${space.name}`);

    // Check workspace membership
    const Workspace = require("../models/Workspace");
    const workspace = await Workspace.findOne({
      _id: space.workspace,
      isDeleted: false
    });

    if (!workspace) {
      console.error(`[ListService] Workspace not found with ID: ${space.workspace}`);
      throw new AppError("Workspace not found", 404);
    }

    const isWorkspaceMember = workspace.members.some(
      (member: any) => member.user.toString() === userId
    );

    if (!isWorkspaceMember) {
      console.error(`[ListService] User ${userId} is not a workspace member`);
      throw new AppError("You do not have access to this space", 403);
    }

    // Check if user is workspace owner or admin
    const workspaceOwnerId = typeof workspace.owner === 'string' ? workspace.owner : workspace.owner?._id?.toString();
    const isOwner = workspaceOwnerId === userId;
    const workspaceMember = workspace.members.find((m: any) => {
      const memberId = typeof m.user === 'string' ? m.user : m.user?._id?.toString();
      return memberId === userId;
    });
    const isAdmin = workspaceMember?.role === 'admin' || workspaceMember?.role === 'owner';

    console.log(`[ListService] User ${userId} access check:`, { isOwner, isAdmin });

    // Check if user is a space member
    const isSpaceMember = space.members?.some((m: any) => {
      const memberId = typeof m.user === 'string' ? m.user : m.user?._id?.toString();
      return memberId === userId;
    });

    console.log(`[ListService] User ${userId} is space member:`, isSpaceMember);

    // Get all lists in the space
    const allLists = await List.find({
      space: spaceId,
      isDeleted: false
    })
      .populate("createdBy", "name email")
      .sort("-createdAt")
      .lean();

    console.log(`[ListService] Found ${allLists.length} total lists`);
    console.log(`[ListService] All list IDs:`, allLists.map((l: any) => ({ id: l._id.toString(), name: l.name })));

    // If user is owner, admin, or space member, return all lists
    if (isOwner || isAdmin || isSpaceMember) {
      console.log(`[ListService] User has full access, returning all ${allLists.length} lists`);
      return allLists;
    }

    // Otherwise, filter to only lists where user is a list member
    const userListMemberships = await ListMember.find({
      user: userId,
      space: spaceId
    }).select('list').lean();

    const accessibleListIds = userListMemberships.map((lm: any) => lm.list.toString());
    console.log(`[ListService] User has access to ${accessibleListIds.length} lists via list membership`);
    console.log(`[ListService] Accessible list IDs:`, accessibleListIds);

    const filteredLists = allLists.filter((list: any) => 
      accessibleListIds.includes(list._id.toString())
    );

    console.log(`[ListService] Returning ${filteredLists.length} filtered lists`);
    console.log(`[ListService] Filtered list names:`, filteredLists.map((l: any) => l.name));
    return filteredLists;
  }

  async getListById(listId: string, userId: string) {
    const list = await List.findOne({
      _id: listId,
      isDeleted: false
    })
      .populate("createdBy", "name email")
      .lean();

    if (!list) {
      throw new AppError("List not found", 404);
    }

    // Verify user has access via workspace membership
    const Workspace = require("../models/Workspace");
    const workspace = await Workspace.findOne({
      _id: list.workspace,
      isDeleted: false
    });

    if (!workspace) {
      throw new AppError("Workspace not found", 404);
    }

    const isWorkspaceMember = workspace.members.some(
      (member: any) => member.user.toString() === userId
    );

    if (!isWorkspaceMember) {
      throw new AppError("You do not have access to this list", 403);
    }

    return list;
  }

  async updateList(listId: string, userId: string, updateData: UpdateListData) {
    const list = await List.findOne({
      _id: listId,
      isDeleted: false
    });

    if (!list) {
      throw new AppError("List not found", 404);
    }

    // Verify user is space owner or admin
    const space = await Space.findOne({
      _id: list.space,
      isDeleted: false
    });

    if (!space) {
      throw new AppError("Space not found", 404);
    }

    const member = space.members.find(
      (m: any) => m.user.toString() === userId
    );

    if (!member || (member.role !== "owner" && member.role !== "admin")) {
      throw new AppError("Only space owner or admin can update this list", 403);
    }

    // Capture old state for audit
    const oldValue = list.toObject();

    if (updateData.name) list.name = updateData.name;
    if (updateData.folderId !== undefined) list.folderId = updateData.folderId;

    await list.save();

    // Log audit
    await logger.logAudit({
      userId,
      workspaceId: list.workspace.toString(),
      resourceType: "List",
      resourceId: list._id.toString(),
      oldValue,
      newValue: list.toObject()
    });

    // Log activity
    await logger.logActivity({
      userId,
      workspaceId: list.workspace.toString(),
      action: "UPDATE",
      resourceType: "List",
      resourceId: list._id.toString()
    });

    return list;
  }

  async deleteList(listId: string, userId: string) {
    const list = await List.findOne({
      _id: listId,
      isDeleted: false
    });

    if (!list) {
      throw new AppError("List not found", 404);
    }

    // Verify user is space owner or admin
    const space = await Space.findOne({
      _id: list.space,
      isDeleted: false
    });

    if (!space) {
      throw new AppError("Space not found", 404);
    }

    const member = space.members.find(
      (m: any) => m.user.toString() === userId
    );

    if (!member || (member.role !== "owner" && member.role !== "admin")) {
      throw new AppError("Only space owner or admin can delete this list", 403);
    }

    await softDelete(List, listId);

    // Log activity
    await logger.logActivity({
      userId,
      workspaceId: list.workspace.toString(),
      action: "DELETE",
      resourceType: "List",
      resourceId: list._id.toString()
    });

    return { message: "List deleted successfully" };
  }
}

module.exports = new ListService();

export {};
