const express = require("express");
const router = express.Router();
const userController = require("../controllers/userController");
const { requireAuth, requireRole, requirePermission, PERMISSIONS } = require("../middlewares/auth");

// 用户列表 (管理员)
router.get("/", requireAuth, requireRole(["admin"]), (req, res) =>
  userController.getUsers(req, res)
);

// 用户统计 (管理员)
router.get("/stats", requireAuth, requireRole(["admin"]), (req, res) =>
  userController.getUserStats(req, res)
);

// 批量操作用户 (管理员)
router.post("/batch", requireAuth, requireRole(["admin"]), (req, res) =>
  userController.batchOperation(req, res)
);

// 用户详情
router.get("/:id", requireAuth, (req, res) => userController.getUserById(req, res));

// 更新用户信息
router.put("/:id", requireAuth, (req, res) => userController.updateUser(req, res));

// 删除用户 (管理员)
router.delete("/:id", requireAuth, requireRole(["admin"]), (req, res) =>
  userController.deleteUser(req, res)
);

// 修改密码
router.put("/:id/password", requireAuth, (req, res) => userController.changePassword(req, res));

// 重置用户密码 (管理员)
router.post("/:id/reset-password", requireAuth, requireRole(["admin"]), (req, res) =>
  userController.resetUserPassword(req, res)
);

// 获取用户活动记录
router.get("/:id/activities", requireAuth, (req, res) =>
  userController.getUserActivities(req, res)
);

module.exports = router;
