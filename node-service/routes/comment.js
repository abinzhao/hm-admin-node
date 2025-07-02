const express = require("express");
const router = express.Router();
const commentController = require("../controllers/commentController");
const {
  requireAuth,
  optionalAuth,
  requirePermission,
  PERMISSIONS,
} = require("../middlewares/auth");

// 评论CRUD操作
router.post("/", requireAuth, requirePermission(PERMISSIONS.COMMENT_CREATE), (req, res) =>
  commentController.createComment(req, res)
);
router.get("/", optionalAuth, (req, res) => commentController.getComments(req, res));
router.put("/:id", requireAuth, (req, res) => commentController.updateComment(req, res));
router.delete("/:id", requireAuth, (req, res) => commentController.deleteComment(req, res));

// 评论点赞
router.post("/:id/like", requireAuth, (req, res) => commentController.toggleCommentLike(req, res));

module.exports = router;
