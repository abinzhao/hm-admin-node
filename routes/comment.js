const express = require("express");
const router = express.Router();
const commentController = require("../controllers/commentController");

// 发布评论
router.post("/create", commentController.createComment);
// 删除评论
router.post("/delete", commentController.deleteComment);
// 查询评论
router.get("/query", commentController.queryComment);
// 举报评论
router.post("/report", commentController.reportComment);

module.exports = router;
