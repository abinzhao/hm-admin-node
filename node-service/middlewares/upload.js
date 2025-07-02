const multer = require("multer");
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");
const logger = require("../utils/logger");

// 创建上传目录
const createUploadDir = (dirPath) => {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
    logger.info(`创建上传目录: ${dirPath}`);
  }
};

// 获取文件类型配置
const getFileTypeConfig = () => {
  return {
    image: {
      extensions: [".jpg", ".jpeg", ".png", ".gif", ".webp", ".svg"],
      maxSize: 5 * 1024 * 1024, // 5MB
      folder: "images",
    },
    document: {
      extensions: [".pdf", ".doc", ".docx", ".xls", ".xlsx", ".ppt", ".pptx", ".txt", ".md"],
      maxSize: 10 * 1024 * 1024, // 10MB
      folder: "documents",
    },
    code: {
      extensions: [
        ".js",
        ".ts",
        ".jsx",
        ".tsx",
        ".vue",
        ".html",
        ".css",
        ".json",
        ".xml",
        ".yaml",
        ".yml",
      ],
      maxSize: 2 * 1024 * 1024, // 2MB
      folder: "code",
    },
    archive: {
      extensions: [".zip", ".rar", ".7z", ".tar", ".gz"],
      maxSize: 50 * 1024 * 1024, // 50MB
      folder: "archives",
    },
    video: {
      extensions: [".mp4", ".avi", ".mov", ".wmv", ".flv", ".webm"],
      maxSize: 100 * 1024 * 1024, // 100MB
      folder: "videos",
    },
    audio: {
      extensions: [".mp3", ".wav", ".flac", ".aac", ".ogg"],
      maxSize: 20 * 1024 * 1024, // 20MB
      folder: "audio",
    },
  };
};

// 检测文件类型
const detectFileType = (filename) => {
  const ext = path.extname(filename).toLowerCase();
  const config = getFileTypeConfig();

  for (const [type, typeConfig] of Object.entries(config)) {
    if (typeConfig.extensions.includes(ext)) {
      return { type, config: typeConfig };
    }
  }

  return null;
};

// 生成安全的文件名
const generateSafeFilename = (originalName) => {
  const ext = path.extname(originalName);
  const basename = path.basename(originalName, ext);
  const timestamp = Date.now();
  const randomString = crypto.randomBytes(6).toString("hex");

  // 清理文件名，只保留字母数字和连字符
  const safeName = basename.replace(/[^a-zA-Z0-9\u4e00-\u9fa5]/g, "_").substring(0, 50);

  return `${safeName}_${timestamp}_${randomString}${ext}`;
};

// 存储配置
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    try {
      const fileTypeInfo = detectFileType(file.originalname);

      if (!fileTypeInfo) {
        return cb(new Error("不支持的文件类型"));
      }

      const uploadDir = path.join(process.cwd(), "uploads", fileTypeInfo.config.folder);
      createUploadDir(uploadDir);

      // 按年月创建子目录
      const now = new Date();
      const yearMonth = `${now.getFullYear()}/${String(now.getMonth() + 1).padStart(2, "0")}`;
      const fullDir = path.join(uploadDir, yearMonth);
      createUploadDir(fullDir);

      cb(null, fullDir);
    } catch (error) {
      cb(error);
    }
  },

  filename: (req, file, cb) => {
    try {
      const safeFilename = generateSafeFilename(file.originalname);
      cb(null, safeFilename);
    } catch (error) {
      cb(error);
    }
  },
});

// 文件过滤器
const fileFilter = (req, file, cb) => {
  try {
    const fileTypeInfo = detectFileType(file.originalname);

    if (!fileTypeInfo) {
      return cb(new Error(`不支持的文件类型: ${path.extname(file.originalname)}`));
    }

    // 检查文件大小
    if (file.size > fileTypeInfo.config.maxSize) {
      return cb(new Error(`文件过大，最大允许 ${fileTypeInfo.config.maxSize / 1024 / 1024}MB`));
    }

    // 检查MIME类型（基础检查）
    const allowedMimeTypes = {
      image: ["image/jpeg", "image/png", "image/gif", "image/webp", "image/svg+xml"],
      document: [
        "application/pdf",
        "application/msword",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "application/vnd.ms-excel",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "text/plain",
        "text/markdown",
      ],
      code: ["text/plain", "application/json", "text/javascript", "text/html", "text/css"],
      archive: ["application/zip", "application/x-rar-compressed", "application/x-7z-compressed"],
      video: ["video/mp4", "video/avi", "video/quicktime", "video/x-msvideo"],
      audio: ["audio/mpeg", "audio/wav", "audio/flac", "audio/aac", "audio/ogg"],
    };

    const expectedMimes = allowedMimeTypes[fileTypeInfo.type] || [];
    if (expectedMimes.length > 0 && !expectedMimes.includes(file.mimetype)) {
      logger.warn(`MIME类型不匹配: ${file.mimetype}, 期望: ${expectedMimes.join(", ")}`);
      // 注意：某些文件的MIME类型可能不准确，这里只记录警告
    }

    cb(null, true);
  } catch (error) {
    cb(error);
  }
};

// 创建上传中间件
const createUploadMiddleware = (options = {}) => {
  const {
    maxFiles = 5,
    maxTotalSize = 100 * 1024 * 1024, // 100MB
    allowedTypes = ["image", "document", "code", "archive"],
  } = options;

  const upload = multer({
    storage,
    fileFilter,
    limits: {
      fileSize: maxTotalSize,
      files: maxFiles,
    },
  });

  return (req, res, next) => {
    upload.array("files", maxFiles)(req, res, (err) => {
      if (err) {
        logger.error("文件上传错误:", err);

        if (err instanceof multer.MulterError) {
          if (err.code === "LIMIT_FILE_SIZE") {
            return res.status(400).json({
              success: false,
              message: "文件大小超出限制",
              error: "FILE_TOO_LARGE",
            });
          }
          if (err.code === "LIMIT_FILE_COUNT") {
            return res.status(400).json({
              success: false,
              message: `最多只能上传 ${maxFiles} 个文件`,
              error: "TOO_MANY_FILES",
            });
          }
        }

        return res.status(400).json({
          success: false,
          message: err.message || "文件上传失败",
          error: "UPLOAD_ERROR",
        });
      }

      // 验证文件类型
      if (req.files && req.files.length > 0) {
        for (const file of req.files) {
          const fileTypeInfo = detectFileType(file.originalname);
          if (!fileTypeInfo || !allowedTypes.includes(fileTypeInfo.type)) {
            return res.status(400).json({
              success: false,
              message: `不允许的文件类型: ${file.originalname}`,
              error: "INVALID_FILE_TYPE",
            });
          }
        }
      }

      next();
    });
  };
};

// 单文件上传中间件
const singleUpload = (fieldName = "file", options = {}) => {
  const {
    maxSize = 10 * 1024 * 1024, // 10MB
    allowedTypes = ["image", "document"],
  } = options;

  const upload = multer({
    storage,
    fileFilter,
    limits: {
      fileSize: maxSize,
    },
  });

  return (req, res, next) => {
    upload.single(fieldName)(req, res, (err) => {
      if (err) {
        logger.error("单文件上传错误:", err);

        if (err instanceof multer.MulterError) {
          if (err.code === "LIMIT_FILE_SIZE") {
            return res.status(400).json({
              success: false,
              message: "文件大小超出限制",
              error: "FILE_TOO_LARGE",
            });
          }
        }

        return res.status(400).json({
          success: false,
          message: err.message || "文件上传失败",
          error: "UPLOAD_ERROR",
        });
      }

      // 验证文件类型
      if (req.file) {
        const fileTypeInfo = detectFileType(req.file.originalname);
        if (!fileTypeInfo || !allowedTypes.includes(fileTypeInfo.type)) {
          return res.status(400).json({
            success: false,
            message: `不允许的文件类型: ${req.file.originalname}`,
            error: "INVALID_FILE_TYPE",
          });
        }
      }

      next();
    });
  };
};

// 头像上传中间件
const avatarUpload = singleUpload("avatar", {
  maxSize: 2 * 1024 * 1024, // 2MB
  allowedTypes: ["image"],
});

// 文档上传中间件
const documentUpload = createUploadMiddleware({
  maxFiles: 10,
  allowedTypes: ["document", "code"],
});

// 图片上传中间件
const imageUpload = createUploadMiddleware({
  maxFiles: 20,
  allowedTypes: ["image"],
});

// 检查用户上传权限
const checkUploadPermission = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: "请先登录",
      error: "UNAUTHORIZED",
    });
  }

  // 检查用户状态
  if (req.user.status !== "active") {
    return res.status(403).json({
      success: false,
      message: "账户状态异常，无法上传文件",
      error: "ACCOUNT_DISABLED",
    });
  }

  // 检查用户等级（可根据需要调整）
  if (req.user.level < 1) {
    return res.status(403).json({
      success: false,
      message: "用户等级不足，无法上传文件",
      error: "INSUFFICIENT_LEVEL",
    });
  }

  next();
};

// 清理临时文件
const cleanupTempFiles = (files) => {
  if (!files) return;

  const fileList = Array.isArray(files) ? files : [files];

  fileList.forEach((file) => {
    if (file && file.path) {
      fs.unlink(file.path, (err) => {
        if (err) {
          logger.error("清理临时文件失败:", err);
        }
      });
    }
  });
};

module.exports = {
  createUploadMiddleware,
  singleUpload,
  avatarUpload,
  documentUpload,
  imageUpload,
  checkUploadPermission,
  detectFileType,
  generateSafeFilename,
  cleanupTempFiles,
  getFileTypeConfig,
};
