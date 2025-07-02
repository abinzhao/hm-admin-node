const express = require("express");
const router = express.Router();
const contentController = require("../controllers/contentController");
const {
  requireAuth,
  optionalAuth,
  requireRole,
  requirePermission,
  PERMISSIONS,
} = require("../middlewares/auth");

// 内容CRUD操作
router.post("/", requireAuth, (req, res) => contentController.createContent(req, res));
router.get("/", optionalAuth, (req, res) => contentController.getContents(req, res));
router.get("/:id", optionalAuth, (req, res) => contentController.getContentById(req, res));
router.put("/:id", requireAuth, (req, res) => contentController.updateContent(req, res));
router.delete("/:id", requireAuth, (req, res) => contentController.deleteContent(req, res));

// 内容审核（管理员/审核员）
router.get(
  "/admin/pending",
  requireAuth,
  requirePermission(PERMISSIONS.CONTENT_AUDIT),
  (req, res) => contentController.getPendingContents(req, res)
);
router.post("/:id/audit", requireAuth, requirePermission(PERMISSIONS.CONTENT_AUDIT), (req, res) =>
  contentController.auditContent(req, res)
);
router.post("/admin/batch-audit", requireAuth, requireRole(["admin"]), (req, res) =>
  contentController.batchAuditContent(req, res)
);

// 内容互动操作
router.post("/:id/like", requireAuth, (req, res) => contentController.toggleLike(req, res));
router.post("/:id/favorite", requireAuth, (req, res) => contentController.toggleFavorite(req, res));

// 用户内容
router.get("/user/:userId", optionalAuth, (req, res) =>
  contentController.getUserContents(req, res)
);

module.exports = router;
