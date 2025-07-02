const express = require("express");
const router = express.Router();
const notificationController = require("../controllers/notificationController");
const { requireAuth, requireRole, requirePermission, PERMISSIONS } = require("../middlewares/auth");

// 用户通知操作
router.get("/", requireAuth, (req, res) => notificationController.getNotifications(req, res));
router.get("/unread-count", requireAuth, (req, res) =>
  notificationController.getUnreadCount(req, res)
);
router.put("/:id/read", requireAuth, (req, res) => notificationController.markAsRead(req, res));
router.put("/read-all", requireAuth, (req, res) => notificationController.markAllAsRead(req, res));

// 管理员通知操作
router.post("/system", requireAuth, requireRole(["admin"]), (req, res) =>
  notificationController.createSystemNotification(req, res)
);

module.exports = router;
