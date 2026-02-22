import { Response, NextFunction } from "express";
import { AuthRequest } from "../types/express";

const asyncHandler = require("../utils/asyncHandler");
const workspaceService = require("../services/workspaceService");
const AppError = require("../utils/AppError");

// @desc    Create new workspace
// @route   POST /api/workspaces
// @access  Private
const createWorkspace = asyncHandler(async (req: AuthRequest, res: Response, next: NextFunction) => {
  const { name } = req.body;

  if (!name) {
    throw new AppError("Please provide workspace name", 400);
  }

  const workspace = await workspaceService.createWorkspace({
    name,
    owner: req.user!.id
  });

  res.status(201).json({
    success: true,
    data: workspace
  });
});

// @desc    Get all user workspaces
// @route   GET /api/workspaces
// @access  Private
const getMyWorkspaces = asyncHandler(async (req: AuthRequest, res: Response, next: NextFunction) => {
  const workspaces = await workspaceService.getUserWorkspaces(req.user!.id);

  res.status(200).json({
    success: true,
    count: workspaces.length,
    data: workspaces
  });
});

// @desc    Get single workspace
// @route   GET /api/workspaces/:id
// @access  Private
const getWorkspace = asyncHandler(async (req: AuthRequest, res: Response, next: NextFunction) => {
  console.log('[WorkspaceController] getWorkspace called', { workspaceId: req.params.id });
  
  const workspace = await workspaceService.getWorkspaceById(req.params.id, req.user!.id);

  console.log('[WorkspaceController] Workspace retrieved successfully', { workspaceId: workspace._id });

  res.status(200).json({
    success: true,
    data: workspace
  });
});

// @desc    Update workspace
// @route   PUT /api/workspaces/:id
// @access  Private
const updateWorkspace = asyncHandler(async (req: AuthRequest, res: Response, next: NextFunction) => {
  const { name } = req.body;

  const workspace = await workspaceService.updateWorkspace(req.params.id, req.user!.id, { name });

  res.status(200).json({
    success: true,
    data: workspace
  });
});

// @desc    Delete workspace
// @route   DELETE /api/workspaces/:id
// @access  Private
const deleteWorkspace = asyncHandler(async (req: AuthRequest, res: Response, next: NextFunction) => {
  const result = await workspaceService.deleteWorkspace(req.params.id, req.user!.id);

  res.status(200).json({
    success: true,
    data: result
  });
});

module.exports = {
  createWorkspace,
  getMyWorkspaces,
  getWorkspace,
  updateWorkspace,
  deleteWorkspace
};

export {};
