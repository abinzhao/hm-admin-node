const express = require("express");
const router = express.Router();
const uploadController = require("../controllers/uploadController");

// 文件上传接口
router.post("/", uploadController.uploadFile);

module.exports = router;
