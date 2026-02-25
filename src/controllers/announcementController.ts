const Announcement = require('../models/Announcement');
const Workspace = require('../models/Workspace');

// @desc    Get all announcements for a workspace
// @route   GET /api/workspaces/:id/announcements
// @access  Private (Workspace members)
exports.getAnnouncements = async (req, res) => {
  try {
    const { id: workspaceId } = req.params;

    const announcements = await Announcement.find({ workspace: workspaceId })
      .populate('author', 'name email avatar')
      .sort({ createdAt: -1 }) // Newest first
      .lean();

    res.status(200).json({
      success: true,
      data: announcements,
    });
  } catch (error) {
    console.error('Error fetching announcements:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch announcements',
      error: error.message,
    });
  }
};

// @desc    Create a new announcement
// @route   POST /api/workspaces/:id/announcements
// @access  Private (Workspace owners and admins only)
exports.createAnnouncement = async (req, res) => {
  try {
    const { id: workspaceId } = req.params;
    const { content } = req.body;
    const userId = req.user.id;

    if (!content || !content.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Announcement content is required',
      });
    }

    // Check if user is workspace owner or admin
    const workspace = await Workspace.findById(workspaceId);
    if (!workspace) {
      return res.status(404).json({
        success: false,
        message: 'Workspace not found',
      });
    }

    const isOwner = workspace.owner.toString() === userId;
    const member = workspace.members.find(
      (m) => m.user.toString() === userId
    );
    const isAdmin = member && (member.role === 'admin' || member.role === 'owner');

    if (!isOwner && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Only workspace owners and admins can post announcements',
      });
    }

    const announcement = await Announcement.create({
      content: content.trim(),
      workspace: workspaceId,
      author: userId,
    });

    const populatedAnnouncement = await Announcement.findById(announcement._id)
      .populate('author', 'name email avatar')
      .lean();

    res.status(201).json({
      success: true,
      data: populatedAnnouncement,
    });
  } catch (error) {
    console.error('Error creating announcement:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create announcement',
      error: error.message,
    });
  }
};

// @desc    Delete an announcement
// @route   DELETE /api/workspaces/:id/announcements/:announcementId
// @access  Private (Workspace owners and admins only)
exports.deleteAnnouncement = async (req, res) => {
  try {
    const { id: workspaceId, announcementId } = req.params;
    const userId = req.user.id;

    // Check if user is workspace owner or admin
    const workspace = await Workspace.findById(workspaceId);
    if (!workspace) {
      return res.status(404).json({
        success: false,
        message: 'Workspace not found',
      });
    }

    const isOwner = workspace.owner.toString() === userId;
    const member = workspace.members.find(
      (m) => m.user.toString() === userId
    );
    const isAdmin = member && (member.role === 'admin' || member.role === 'owner');

    if (!isOwner && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Only workspace owners and admins can delete announcements',
      });
    }

    const announcement = await Announcement.findOneAndDelete({
      _id: announcementId,
      workspace: workspaceId,
    });

    if (!announcement) {
      return res.status(404).json({
        success: false,
        message: 'Announcement not found',
      });
    }

    res.status(200).json({
      success: true,
      message: 'Announcement deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting announcement:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete announcement',
      error: error.message,
    });
  }
};
