const express = require("express");
const {
  createCustomField,
  updateCustomField,
  deleteCustomField,
  getFieldsByWorkspace,
  getFieldsByProject
} = require("../controllers/customFieldController");
const { protect } = require("../middlewares/authMiddleware");
const validate = require("../utils/validation");
const {
  createCustomFieldSchema,
  updateCustomFieldSchema
} = require("../validators/customFieldValidators");

const customFieldRouter = express.Router();

// POST /api/custom-fields - Create custom field
// PUT /api/custom-fields/:id - Update custom field
// DELETE /api/custom-fields/:id - Delete custom field
// GET /api/custom-fields/workspace/:workspaceId - Get fields by workspace
// GET /api/custom-fields/project/:projectId - Get fields by project

customFieldRouter.post("/", protect, validate(createCustomFieldSchema), createCustomField);
customFieldRouter.put("/:id", protect, validate(updateCustomFieldSchema), updateCustomField);
customFieldRouter.delete("/:id", protect, deleteCustomField);
customFieldRouter.get("/workspace/:workspaceId", protect, getFieldsByWorkspace);
customFieldRouter.get("/project/:projectId", protect, getFieldsByProject);

module.exports = customFieldRouter;

export {};
