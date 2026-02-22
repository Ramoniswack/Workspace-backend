const { z } = require("zod");

const createSpaceSchema = z.object({
  name: z.string().min(1, "Space name is required").max(100, "Space name cannot exceed 100 characters"),
  description: z.string().max(500, "Description cannot exceed 500 characters").optional()
});

const updateSpaceSchema = z.object({
  name: z.string().min(1, "Space name is required").max(100, "Space name cannot exceed 100 characters").optional(),
  description: z.string().max(500, "Description cannot exceed 500 characters").optional(),
  status: z.enum(["active", "inactive"]).optional()
});

module.exports = {
  createSpaceSchema,
  updateSpaceSchema
};

export {};
