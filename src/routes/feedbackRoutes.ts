const express = require("express");
const { protect } = require("../middlewares/authMiddleware");
const {
  createFeedback,
  getAllFeedback,
  resolveFeedback
} = require("../controllers/feedbackController");
const {
  createFeedbackSchema,
  getFeedbackSchema
} = require("../validators/feedbackValidators");

const router = express.Router();

// Validation middleware that handles both body and query validation
const validate = (schema: any) => {
  return (req: any, res: any, next: any) => {
    try {
      const result = schema.safeParse(req);
      
      if (!result.success) {
        const zodError = result.error as any;
        if (!zodError || !zodError.errors || !Array.isArray(zodError.errors)) {
          return res.status(400).json({
            success: false,
            message: "Validation failed"
          });
        }

        const errors = zodError.errors.map((err: any) => ({
          field: err.path.join("."),
          message: err.message
        }));

        return res.status(400).json({
          success: false,
          message: `Validation failed: ${errors.map((e: any) => e.message).join(", ")}`,
          errors
        });
      }

      // Update req with validated data (only body, query is read-only)
      if (result.data.body) req.body = result.data.body;
      // Don't try to set req.query as it's read-only in Express
      
      next();
    } catch (error) {
      next(error);
    }
  };
};

// POST /api/feedback - Create feedback submission (Workspace admin/owner only)
router.post("/", protect, validate(createFeedbackSchema), createFeedback);

// GET /api/feedback - Get all feedback submissions (Super User only)
router.get("/", protect, validate(getFeedbackSchema), getAllFeedback);

// PATCH /api/feedback/:id/resolve - Mark feedback as resolved (Super User only)
router.patch("/:id/resolve", protect, resolveFeedback);

module.exports = router;

export {};
