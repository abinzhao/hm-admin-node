const express = require("express");
const router = express.Router();
const softwareController = require("../controllers/softwareController");

// 检查包名是否存在
router.get("/check-package", softwareController.checkPackageName);

// 删除软件
router.post("/delete", softwareController.deleteSoftware);

module.exports = router;
