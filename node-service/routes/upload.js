const express = require("express");
const router = express.Router();
const uploadController = require("../controllers/uploadController");
const {
  requireAuth,
  optionalAuth,
  requirePermission,
  PERMISSIONS,
} = require("../middlewares/auth");
const {
  createUploadMiddleware,
  avatarUpload,
  documentUpload,
  imageUpload,
  checkUploadPermission,
} = require("../middlewares/upload");

// 通用文件上传
router.post("/", requireAuth, checkUploadPermission, createUploadMiddleware(), (req, res) =>
  uploadController.uploadFiles(req, res)
);

// 头像上传
router.post("/avatar", requireAuth, checkUploadPermission, avatarUpload, (req, res) =>
  uploadController.uploadAvatar(req, res)
);

// 文档上传
router.post("/documents", requireAuth, checkUploadPermission, documentUpload, (req, res) =>
  uploadController.uploadFiles(req, res)
);

// 图片上传
router.post("/images", requireAuth, checkUploadPermission, imageUpload, (req, res) =>
  uploadController.uploadFiles(req, res)
);

// 文件管理
router.get("/files", requireAuth, (req, res) => uploadController.getFiles(req, res));
router.get("/files/:id", requireAuth, (req, res) => uploadController.getFileById(req, res));
router.put("/files/:id", requireAuth, (req, res) => uploadController.updateFile(req, res));
router.delete("/files/:id", requireAuth, (req, res) => uploadController.deleteFile(req, res));

// 文件下载
router.get("/files/:id/download", optionalAuth, (req, res) =>
  uploadController.downloadFile(req, res)
);

// 存储统计
router.get("/stats", requireAuth, (req, res) => uploadController.getStorageStats(req, res));

// 批量操作
router.post("/batch-delete", requireAuth, (req, res) =>
  uploadController.batchDeleteFiles(req, res)
);

// 上传配置
router.get("/config", (req, res) => uploadController.getUploadConfig(req, res));

module.exports = router;
