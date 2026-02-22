const { z } = require("zod");

const createListSchema = z.object({
  name: z.string().min(1, "List name is required").max(100, "List name cannot exceed 100 characters"),
  folderId: z.string().optional()
});

const updateListSchema = z.object({
  name: z.string().min(1, "List name is required").max(100, "List name cannot exceed 100 characters").optional(),
  folderId: z.string().optional().nullable()
});

module.exports = {
  createListSchema,
  updateListSchema
};

export {};
