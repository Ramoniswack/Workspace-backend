const { z } = require("zod");

const createProjectSchema = z.object({
  name: z.string().min(1, "Project name is required").max(100, "Name cannot exceed 100 characters"),
  description: z.string().max(500, "Description cannot exceed 500 characters").optional()
});

const updateProjectSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional()
});

module.exports = {
  createProjectSchema,
  updateProjectSchema
};

export {};
