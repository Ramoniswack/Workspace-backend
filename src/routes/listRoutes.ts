const express = require("express");
const {
  createList,
  getSpaceLists,
  getList,
  updateList,
  deleteList
} = require("../controllers/listController");
const { protect } = require("../middlewares/authMiddleware");
const { requirePermission } = require("../permissions/permission.middleware");
const { checkListLimit } = require("../middlewares/subscriptionMiddleware");
const validate = require("../utils/validation");
const { createListSchema, updateListSchema } = require("../validators/listValidators");

// Space-scoped router
const spaceListRouter = express.Router({ mergeParams: true });

// POST /api/spaces/:spaceId/lists - Create list (admin or owner)
// GET /api/spaces/:spaceId/lists - Get all lists (any member)
spaceListRouter.post("/", protect, requirePermission("CREATE_LIST"), checkListLimit, validate(createListSchema), createList);
spaceListRouter.get("/", protect, requirePermission("VIEW_LIST"), getSpaceLists);

// Standalone list router
const listRouter = express.Router();

// GET /api/lists/:id - Get single list (any member)
// PATCH /api/lists/:id - Update list (member or higher)
// DELETE /api/lists/:id - Delete list (admin or owner)
listRouter.get("/:id", protect, requirePermission("VIEW_LIST"), getList);
listRouter.patch("/:id", protect, requirePermission("UPDATE_LIST"), validate(updateListSchema), updateList);
listRouter.delete("/:id", protect, requirePermission("DELETE_LIST"), deleteList);

module.exports = { spaceListRouter, listRouter };

export {};
