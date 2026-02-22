const { z } = require("zod");

const createTaskDependencySchema = z.object({
  taskId: z.string().min(1, "Task ID is required"),
  dependsOnId: z.string().min(1, "Dependency task ID is required"),
  type: z.enum(["FS", "SS", "FF", "SF"]).optional().default("FS")
});

module.exports = {
  createTaskDependencySchema
};

export {};
