/**
 * 移动端专用路由
 * 为移动端提供优化的API接口
 */

const express = require("express");
const mobileController = require("../controllers/mobileController");
const { requireAuth } = require("../middlewares/auth");

const router = express.Router();

// 所有移动端路由都需要认证
router.use(requireAuth);

// 移动端聚合接口
router.get("/home", mobileController.getHomeData); // 首页数据聚合
router.get("/sync", mobileController.quickSync); // 快速同步
router.get("/offline", mobileController.getOfflineData); // 离线数据

// 移动端优化接口
router.post("/batch", mobileController.batchOperation); // 批量操作
router.get("/search", mobileController.lightSearch); // 轻量级搜索

// 设备管理
router.post("/device", mobileController.reportDeviceInfo); // 设备信息上报
router.get("/network", mobileController.networkCheck); // 网络状态检测

module.exports = router;
