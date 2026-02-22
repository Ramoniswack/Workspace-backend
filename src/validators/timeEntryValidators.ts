const { z } = require("zod");

const startTimerSchema = z.object({
  description: z.string().max(500, "Description cannot exceed 500 characters").optional()
});

const addManualTimeSchema = z.object({
  taskId: z.string().min(1, "Task ID is required"),
  startTime: z.string().datetime("Invalid start time format"),
  endTime: z.string().datetime("Invalid end time format"),
  description: z.string().max(500, "Description cannot exceed 500 characters").optional()
}).refine(
  (data) => {
    const start = new Date(data.startTime);
    const end = new Date(data.endTime);
    return end > start;
  },
  {
    message: "End time must be after start time",
    path: ["endTime"]
  }
);

module.exports = {
  startTimerSchema,
  addManualTimeSchema
};

export {};
