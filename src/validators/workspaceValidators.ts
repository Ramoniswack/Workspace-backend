const { z } = require("zod");

const createWorkspaceSchema = z.object({
  name: z.string().min(1, "Workspace name is required").max(100, "Name cannot exceed 100 characters")
});

const updateWorkspaceSchema = z.object({
  name: z.string().min(1, "Workspace name is required").max(100, "Name cannot exceed 100 characters").optional()
});

module.exports = {
  createWorkspaceSchema,
  updateWorkspaceSchema
};

export {};
