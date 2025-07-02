const logger = require("../utils/logger");

/**
 * 全局错误处理中间件
 */
const errorHandler = (error, req, res, next) => {
  // 记录错误日志
  logger.error("全局错误捕获:", {
    message: error.message,
    stack: error.stack,
    url: req.originalUrl,
    method: req.method,
    ip: req.ip,
    userAgent: req.get("User-Agent"),
  });

  // 默认错误响应
  let status = 500;
  let message = "服务器内部错误";
  let code = "INTERNAL_SERVER_ERROR";

  // Sequelize数据库错误
  if (error.name === "SequelizeValidationError") {
    status = 400;
    message = "数据验证失败";
    code = "VALIDATION_ERROR";
    const details = error.errors.map((err) => ({
      field: err.path,
      message: err.message,
    }));

    return res.status(status).json({
      success: false,
      message,
      code,
      errors: details,
    });
  }

  if (error.name === "SequelizeUniqueConstraintError") {
    status = 400;
    message = "数据已存在";
    code = "DUPLICATE_ERROR";
  }

  if (error.name === "SequelizeDatabaseError") {
    status = 500;
    message = "数据库操作失败";
    code = "DATABASE_ERROR";
  }

  // JWT错误
  if (error.name === "JsonWebTokenError") {
    status = 401;
    message = "无效的访问令牌";
    code = "INVALID_TOKEN";
  }

  if (error.name === "TokenExpiredError") {
    status = 401;
    message = "访问令牌已过期";
    code = "TOKEN_EXPIRED";
  }

  // 文件上传错误
  if (error.code === "LIMIT_FILE_SIZE") {
    status = 400;
    message = "文件大小超出限制";
    code = "FILE_TOO_LARGE";
  }

  if (error.code === "LIMIT_FILE_COUNT") {
    status = 400;
    message = "文件数量超出限制";
    code = "TOO_MANY_FILES";
  }

  // 自定义错误
  if (error.statusCode) {
    status = error.statusCode;
    message = error.message;
    code = error.code || "CUSTOM_ERROR";
  }

  // 生产环境下隐藏详细错误信息
  if (process.env.NODE_ENV === "production" && status === 500) {
    message = "服务器内部错误，请稍后重试";
  }

  res.status(status).json({
    success: false,
    message,
    code,
    ...(process.env.NODE_ENV === "development" && {
      stack: error.stack,
      originalError: error.message,
    }),
  });
};

/**
 * 404错误处理
 */
const notFoundHandler = (req, res) => {
  res.status(404).json({
    success: false,
    message: "请求的资源不存在",
    code: "NOT_FOUND",
    path: req.originalUrl,
  });
};

/**
 * 创建自定义错误
 */
class CustomError extends Error {
  constructor(message, statusCode = 500, code = "CUSTOM_ERROR") {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.name = "CustomError";
  }
}

/**
 * 创建认证错误
 */
const authError = (message = "身份验证失败") => {
  return new CustomError(message, 401, "AUTH_ERROR");
};

/**
 * 创建权限错误
 */
const permissionError = (message = "权限不足") => {
  return new CustomError(message, 403, "PERMISSION_ERROR");
};

/**
 * 创建限流错误
 */
const rateLimitError = (message = "请求过于频繁，请稍后再试") => {
  return new CustomError(message, 429, "RATE_LIMIT_ERROR");
};

/**
 * 创建不存在错误
 */
const notFoundError = (resource = "资源") => {
  return new CustomError(`${resource}不存在`, 404, "NOT_FOUND");
};

/**
 * 创建验证错误
 */
const validationError = (message = "数据验证失败") => {
  return new CustomError(message, 400, "VALIDATION_ERROR");
};

module.exports = {
  errorHandler,
  notFoundHandler,
  CustomError,
  authError,
  permissionError,
  rateLimitError,
  notFoundError,
  validationError,
};
