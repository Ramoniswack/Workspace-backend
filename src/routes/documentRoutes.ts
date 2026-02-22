const express = require("express");
const documentController = require("../controllers/documentController");
const { protect } = require("../middlewares/authMiddleware");

const router = express.Router();

// All routes require authentication
router.use(protect);

// Document CRUD
router.post("/", documentController.createDocument);
router.get("/me", documentController.getMyDocuments);
router.get("/workspace/:workspaceId", documentController.getWorkspaceDocuments);
router.get("/workspace/:workspaceId/hierarchy", documentController.getDocumentHierarchy);
router.get("/:id", documentController.getDocument);
router.patch("/:id", documentController.updateDocument);
router.delete("/:id", documentController.deleteDocument);

module.exports = router;

export {};
