const express = require("express");
const {
  getTableMembers,
  addTableMember,
  updateTableMember,
  removeTableMember,
} = require("../controllers/tableMemberController");
const { protect } = require("../middlewares/authMiddleware");
const { requirePermission } = require("../permissions/permission.middleware");

const router = express.Router({ mergeParams: true });

/**
 * @route   GET /api/tables/:tableId/table-members
 * @desc    Get table members
 * @access  Private (Member or higher)
 */
router.get("/", protect, getTableMembers);

/**
 * @route   POST /api/tables/:tableId/table-members
 * @desc    Add table member
 * @access  Private (Admin or Owner)
 */
router.post("/", protect, requirePermission("MANAGE_SPACE_PERMISSIONS"), addTableMember);

/**
 * @route   PATCH /api/tables/:tableId/table-members/:userId
 * @desc    Update table member permissions
 * @access  Private (Admin or Owner)
 */
router.patch("/:userId", protect, requirePermission("MANAGE_SPACE_PERMISSIONS"), updateTableMember);

/**
 * @route   DELETE /api/tables/:tableId/table-members/:userId
 * @desc    Remove table member
 * @access  Private (Admin or Owner)
 */
router.delete("/:userId", protect, requirePermission("MANAGE_SPACE_PERMISSIONS"), removeTableMember);

module.exports = router;
export {};
