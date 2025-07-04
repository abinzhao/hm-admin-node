// controllers/softwareController.js
// 软件相关控制器
const { Software } = require("../models");
const { logOperation } = require("../utils/operationLog");
const fs = require("fs");
const path = require("path");

/**
 * 检查软件包名是否已存在
 * GET /api/software/check-package?package_name=xxx
 */
exports.checkPackageName = async (req, res) => {
  const { package_name } = req.query;
  if (!package_name) return res.fail("缺少包名参数");
  const exist = await Software.findOne({ where: { package_name } });
  if (exist) {
    return res.success({ exists: true }, "包名已存在");
  } else {
    return res.success({ exists: false }, "包名可用");
  }
};

/**
 * 删除软件（硬删除）
 * @param {number} id 软件ID
 * @Time O(1)
 * @Space O(1)
 */
exports.deleteSoftware = async (req, res) => {
  try {
    const { id } = req.body;
    if (!id) return res.fail("缺少软件ID");
    const software = await Software.findByPk(id);
    if (!software) return res.fail("软件不存在");
    // 删除icon文件（如有）
    if (software.icon) {
      const iconPath = path.join(__dirname, "../Files/images", path.basename(software.icon));
      if (fs.existsSync(iconPath)) {
        fs.unlinkSync(iconPath);
      }
    }
    // 删除软件包文件（如有）
    if (software.download_url) {
      const pkgPath = path.join(
        __dirname,
        "../Files/packages",
        path.basename(software.download_url)
      );
      if (fs.existsSync(pkgPath)) {
        fs.unlinkSync(pkgPath);
      }
    }
    await logOperation({
      user_id: software.user_id,
      action: "delete",
      target_type: "software",
      target_id: id,
      detail: JSON.stringify(software),
    });
    await software.destroy(); // 硬删除
    res.success({}, "软件删除成功");
  } catch (err) {
    res.fail("软件删除失败");
  }
};
