// controllers/uploadController.js
// 文件上传控制器
const path = require("path");
const fs = require("fs");
const multer = require("multer");

// 文件存储目录映射
const DIR_MAP = {
  images: "Files/images",
  packages: "Files/packages",
  other: "Files/other",
};

// 动态设置存储目录和文件名
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const type = req.body.type || "other";
    const dir = DIR_MAP[type] || DIR_MAP.other;
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: function (req, file, cb) {
    cb(null, file.originalname);
  },
});

const upload = multer({ storage });

/**
 * 文件上传接口
 * 支持图片、.hap、.zip等，.hap同名先存新再删旧，返回下载链接
 */
exports.uploadFile = [
  upload.single("file"),
  async (req, res) => {
    try {
      const file = req.file;
      const type = req.body.type || "other";
      if (!file) return res.fail("未检测到上传文件");
      // .hap特殊处理：同名先存新再删旧，文件名保持一致
      if (type === "packages" && path.extname(file.originalname) === ".hap") {
        const dir = DIR_MAP.packages;
        const files = fs.readdirSync(dir);
        // 查找同名.hap（不区分大小写）
        const sameName = files.find(
          (f) => f.toLowerCase() === file.originalname.toLowerCase() && f !== file.filename
        );
        if (sameName) {
          // 先保存新文件，再删除旧文件
          const oldPath = path.join(dir, sameName);
          fs.unlinkSync(oldPath);
        }
      }
      // 返回下载链接
      const downloadUrl = `/files/${type}/${encodeURIComponent(file.originalname)}`;
      res.success({ url: downloadUrl }, "上传成功");
    } catch (err) {
      res.fail("文件上传失败");
    }
  },
];
