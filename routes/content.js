const express = require("express");
const router = express.Router();
const contentController = require("../controllers/contentController");

// 创建内容
router.post("/create", contentController.createContent);
// 更新内容
router.post("/update", contentController.updateContent);
// 删除内容
router.post("/delete", contentController.deleteContent);
// 查询内容
router.get("/query", contentController.queryContent);
// 点赞/取消点赞
router.post("/like", contentController.likeContent);
// 收藏/取消收藏
router.post("/collect", contentController.collectContent);
// 举报内容
router.post("/report", contentController.reportContent);

module.exports = router;
