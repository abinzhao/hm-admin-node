/**
 * 聊天路由
 * 处理聊天相关的API路径
 */

const express = require("express");
const chatController = require("../controllers/chatController");
const { requireAuth } = require("../middlewares/auth");

const router = express.Router();

// 所有聊天路由都需要认证
router.use(requireAuth);

// 聊天列表和创建
router.get("/", chatController.getChats); // 获取用户聊天列表
router.post("/private", chatController.createPrivateChat); // 创建私聊
router.post("/group", chatController.createGroupChat); // 创建群聊

// 聊天操作
router.get("/:id", chatController.getChatById); // 获取聊天详情
router.post("/:id/messages", chatController.sendMessage); // 发送消息
router.get("/:id/messages", chatController.getMessages); // 获取消息列表
router.put("/:id/read", chatController.markAsRead); // 标记已读

// 消息操作
router.put("/:id/messages/:messageId", chatController.editMessage); // 编辑消息
router.delete("/:id/messages/:messageId", chatController.deleteMessage); // 删除消息

// 成员管理
router.get("/:id/members", chatController.getMembers); // 获取成员列表
router.post("/:id/members", chatController.addMember); // 添加成员
router.delete("/:id/members/:memberId", chatController.removeMember); // 移除成员

// 消息搜索
router.get("/:id/search", chatController.searchMessages); // 搜索消息

module.exports = router;
