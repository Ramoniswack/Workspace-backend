const activityService = require("../services/activityService");
const asyncHandler = require("../utils/asyncHandler");

/**
 * Get activities with filters
 * GET /api/activities
 */
const getActivities = asyncHandler(async (req: any, res: any) => {
  console.log('[ActivityController] getActivities called', { query: req.query });
  
  const userId = req.user.id;
  const { workspaceId, spaceId, listId, limit, skip } = req.query;

  const activities = await activityService.getActivities({
    userId,
    workspaceId,
    spaceId,
    listId,
    limit: limit ? parseInt(limit) : 50,
    skip: skip ? parseInt(skip) : 0,
  });

  console.log('[ActivityController] Activities retrieved', { count: activities.length });

  res.status(200).json({
    success: true,
    count: activities.length,
    data: activities,
  });
});

/**
 * Create a comment on a task
 * POST /api/tasks/:taskId/comments
 */
const createComment = asyncHandler(async (req: any, res: any) => {
  const { taskId } = req.params;
  const { content, mentions } = req.body;
  const userId = req.user.id;

  const activity = await activityService.createComment({
    taskId,
    userId,
    content,
    mentions: mentions || [],
  });

  res.status(201).json({
    success: true,
    data: activity,
  });
});

/**
 * Get activity feed for a task (comments + updates)
 * GET /api/tasks/:taskId/activity
 */
const getTaskActivity = asyncHandler(async (req: any, res: any) => {
  const { taskId } = req.params;
  const userId = req.user.id;
  const { limit, skip, type } = req.query;

  const activities = await activityService.getTaskActivity(taskId, userId, {
    limit: limit ? parseInt(limit) : 50,
    skip: skip ? parseInt(skip) : 0,
    type, // 'comment' or 'update' or undefined for all
  });

  res.status(200).json({
    success: true,
    count: activities.length,
    data: activities,
  });
});

/**
 * Update a comment
 * PUT /api/activities/:activityId
 */
const updateComment = asyncHandler(async (req: any, res: any) => {
  const { activityId } = req.params;
  const { content } = req.body;
  const userId = req.user.id;

  const activity = await activityService.updateComment(activityId, userId, content);

  res.status(200).json({
    success: true,
    data: activity,
  });
});

/**
 * Delete a comment
 * DELETE /api/activities/:activityId
 */
const deleteComment = asyncHandler(async (req: any, res: any) => {
  const { activityId } = req.params;
  const userId = req.user.id;

  const result = await activityService.deleteComment(activityId, userId);

  res.status(200).json({
    success: true,
    message: result.message,
  });
});

/**
 * Add reaction to a comment
 * POST /api/activities/:activityId/reactions
 */
const addReaction = asyncHandler(async (req: any, res: any) => {
  const { activityId } = req.params;
  const { emoji } = req.body;
  const userId = req.user.id;

  const activity = await activityService.addReaction(activityId, userId, emoji);

  res.status(200).json({
    success: true,
    data: activity,
  });
});

/**
 * Remove reaction from a comment
 * DELETE /api/activities/:activityId/reactions
 */
const removeReaction = asyncHandler(async (req: any, res: any) => {
  const { activityId } = req.params;
  const userId = req.user.id;

  const activity = await activityService.removeReaction(activityId, userId);

  res.status(200).json({
    success: true,
    data: activity,
  });
});

/**
 * Get user activity across workspace
 * GET /api/workspaces/:workspaceId/activity
 */
const getUserActivity = asyncHandler(async (req: any, res: any) => {
  const { workspaceId } = req.params;
  const userId = req.user.id;
  const { limit, skip } = req.query;

  const activities = await activityService.getUserActivity(userId, workspaceId, {
    limit: limit ? parseInt(limit) : 50,
    skip: skip ? parseInt(skip) : 0,
  });

  res.status(200).json({
    success: true,
    count: activities.length,
    data: activities,
  });
});

module.exports = {
  getActivities,
  createComment,
  getTaskActivity,
  updateComment,
  deleteComment,
  addReaction,
  removeReaction,
  getUserActivity,
};

export {};
