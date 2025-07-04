const express = require("express");
const router = express.Router();
const notificationController = require("../controllers/notificationController");

// 发布通知
router.post("/create", notificationController.createNotification);
// 编辑通知
router.post("/update", notificationController.updateNotification);
// 删除通知
router.post("/delete", notificationController.deleteNotification);
// 查询通知
router.get("/query", notificationController.queryNotification);
// 标记已读
router.post("/read", notificationController.markRead);

module.exports = router;
