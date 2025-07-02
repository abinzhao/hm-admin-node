const jwt = require("jsonwebtoken");
const passport = require("passport");
const rateLimit = require("express-rate-limit");
const { User } = require("../models");
const { authError, permissionError, rateLimitError, notFoundError } = require("./errorHandler");
const logger = require("../utils/logger");

// JWT令牌生成
const generateTokens = (user) => {
  const payload = {
    userId: user.id,
    email: user.email,
    role: user.role,
  };

  const accessToken = jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || "7d",
  });

  const refreshToken = jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || "30d",
  });

  return { accessToken, refreshToken };
};

// 验证JWT令牌
const verifyToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return next(authError("请提供有效的访问令牌"));
    }

    const token = authHeader.substring(7);

    // 验证令牌
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // 获取用户信息
    const user = await User.findByPk(decoded.userId, {
      attributes: { exclude: ["password"] },
    });

    if (!user) {
      return next(authError("用户不存在"));
    }

    if (user.status !== "active") {
      return next(authError("账户已被禁用"));
    }

    // 更新最后登录信息
    await user.update({
      last_login_at: new Date(),
      last_login_ip: req.ip || req.connection.remoteAddress,
    });

    req.user = user;
    req.token = token;
    next();
  } catch (error) {
    if (error.name === "TokenExpiredError") {
      return next(authError("访问令牌已过期"));
    }
    if (error.name === "JsonWebTokenError") {
      return next(authError("无效的访问令牌"));
    }
    next(error);
  }
};

// 可选认证（不强制登录）
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return next();
    }

    const token = authHeader.substring(7);

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findByPk(decoded.userId, {
      attributes: { exclude: ["password"] },
    });

    if (user && user.status === "active") {
      req.user = user;
      req.token = token;
    }

    next();
  } catch (error) {
    // 可选认证失败时不抛出错误，继续执行
    next();
  }
};

// 角色权限验证
const requireRole = (roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return next(authError("请先登录"));
    }

    if (!roles.includes(req.user.role)) {
      logger.security("权限不足访问", {
        userId: req.user.id,
        userRole: req.user.role,
        requiredRoles: roles,
        url: req.originalUrl,
        method: req.method,
        ip: req.ip,
      });

      return next(permissionError("权限不足"));
    }

    next();
  };
};

// 资源所有者验证
const requireOwnership = (resourceIdParam = "id", resourceModel = null) => {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return next(authError("请先登录"));
      }

      const resourceId = req.params[resourceIdParam];

      // 管理员可以访问所有资源
      if (req.user.role === "admin") {
        return next();
      }

      // 如果提供了资源模型，查询资源所有者
      if (resourceModel) {
        const resource = await resourceModel.findByPk(resourceId);
        if (!resource) {
          return next(notFoundError("资源"));
        }

        if (resource.user_id !== req.user.id) {
          return next(permissionError("只能操作自己的资源"));
        }
      } else {
        // 简单的ID比较
        if (parseInt(resourceId) !== req.user.id) {
          return next(permissionError("只能操作自己的资源"));
        }
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};

// 邮箱验证中间件
const requireEmailVerified = (req, res, next) => {
  if (!req.user) {
    return next(authError("请先登录"));
  }

  if (!req.user.email_verified) {
    return next(permissionError("请先验证邮箱"));
  }

  next();
};

// 账户状态检查
const requireActiveAccount = (req, res, next) => {
  if (!req.user) {
    return next(authError("请先登录"));
  }

  if (req.user.status !== "active") {
    return next(permissionError("账户已被禁用"));
  }

  next();
};

// 登录限流
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15分钟
  max: 5, // 最多5次尝试
  skipSuccessfulRequests: true,
  keyGenerator: (req) => {
    return `${req.ip}:${req.body.email || "unknown"}`;
  },
  handler: (req, res, next) => {
    logger.security("登录尝试过于频繁", {
      ip: req.ip,
      email: req.body.email,
      userAgent: req.get("User-Agent"),
    });

    next(rateLimitError("登录尝试过于频繁，请15分钟后再试"));
  },
});

// 注册限流
const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1小时
  max: 3, // 最多3次注册
  keyGenerator: (req) => req.ip,
  handler: (req, res, next) => {
    logger.security("注册尝试过于频繁", {
      ip: req.ip,
      userAgent: req.get("User-Agent"),
    });

    next(rateLimitError("注册尝试过于频繁，请1小时后再试"));
  },
});

// 验证码限流
const verificationLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5分钟
  max: 3, // 最多3次发送
  keyGenerator: (req) => `${req.ip}:${req.body.email || req.body.phone || "unknown"}`,
  handler: (req, res, next) => {
    next(rateLimitError("验证码发送过于频繁，请5分钟后再试"));
  },
});

// 文件上传权限检查
const requireUploadPermission = (req, res, next) => {
  if (!req.user) {
    return next(authError("请先登录"));
  }

  // 检查用户等级或其他条件
  if (req.user.level < 1) {
    return next(permissionError("用户等级不足，无法上传文件"));
  }

  next();
};

// API访问限流
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15分钟
  max: (req) => {
    // 根据用户角色设置不同的限制
    if (req.user?.role === "admin") return 1000;
    if (req.user?.role === "auditor") return 500;
    if (req.user) return 200;
    return 100; // 未登录用户
  },
  keyGenerator: (req) => {
    return req.user ? `user:${req.user.id}` : `ip:${req.ip}`;
  },
  handler: (req, res, next) => {
    next(rateLimitError());
  },
});

// 令牌刷新
const refreshToken = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return next(authError("请提供刷新令牌"));
    }

    // 验证刷新令牌
    const decoded = jwt.verify(refreshToken, process.env.JWT_SECRET);

    // 检查用户是否存在且活跃
    const user = await User.findByPk(decoded.userId, {
      attributes: { exclude: ["password"] },
    });

    if (!user || user.status !== "active") {
      return next(authError("无效的刷新令牌"));
    }

    // 生成新的令牌对
    const tokens = generateTokens(user);

    res.json({
      success: true,
      data: {
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        user: user,
      },
    });
  } catch (error) {
    if (error.name === "TokenExpiredError") {
      return next(authError("刷新令牌已过期，请重新登录"));
    }
    if (error.name === "JsonWebTokenError") {
      return next(authError("无效的刷新令牌"));
    }
    next(error);
  }
};

// 简化的令牌处理（不使用黑名单）
const blacklistToken = async (token) => {
  // 简化版本：不使用Redis黑名单
  // 在无状态JWT中，令牌在过期前都是有效的
  // 如需更严格的控制，可以缩短令牌有效期
  logger.info("用户登出，令牌将在过期时间后自动失效");
};

// Passport认证中间件
const passportAuth = (strategy) => {
  return passport.authenticate(strategy, { session: false });
};

// 权限定义
const PERMISSIONS = {
  // 内容相关权限
  CONTENT_CREATE: "content:create",
  CONTENT_READ: "content:read",
  CONTENT_UPDATE: "content:update",
  CONTENT_DELETE: "content:delete",
  CONTENT_AUDIT: "content:audit",
  CONTENT_PUBLISH: "content:publish",

  // 用户相关权限
  USER_READ: "user:read",
  USER_UPDATE: "user:update",
  USER_DELETE: "user:delete",
  USER_BAN: "user:ban",

  // 评论相关权限
  COMMENT_CREATE: "comment:create",
  COMMENT_READ: "comment:read",
  COMMENT_UPDATE: "comment:update",
  COMMENT_DELETE: "comment:delete",
  COMMENT_MODERATE: "comment:moderate",

  // 管理员权限
  ADMIN_ALL: "admin:all",
  ADMIN_USERS: "admin:users",
  ADMIN_CONTENT: "admin:content",
  ADMIN_SYSTEM: "admin:system",
};

// 角色权限映射
const ROLE_PERMISSIONS = {
  user: [
    PERMISSIONS.CONTENT_CREATE,
    PERMISSIONS.CONTENT_READ,
    PERMISSIONS.COMMENT_CREATE,
    PERMISSIONS.COMMENT_READ,
    PERMISSIONS.USER_READ,
  ],
  auditor: [
    PERMISSIONS.CONTENT_CREATE,
    PERMISSIONS.CONTENT_READ,
    PERMISSIONS.CONTENT_AUDIT,
    PERMISSIONS.COMMENT_CREATE,
    PERMISSIONS.COMMENT_READ,
    PERMISSIONS.COMMENT_MODERATE,
    PERMISSIONS.USER_READ,
  ],
  admin: [PERMISSIONS.ADMIN_ALL],
};

// 检查用户权限
const hasPermission = (user, permission) => {
  if (!user) return false;

  const userPermissions = ROLE_PERMISSIONS[user.role] || [];

  // 管理员拥有所有权限
  if (userPermissions.includes(PERMISSIONS.ADMIN_ALL)) {
    return true;
  }

  return userPermissions.includes(permission);
};

// 权限验证中间件
const requirePermission = (permission) => {
  return (req, res, next) => {
    if (!req.user) {
      return next(authError("请先登录"));
    }

    if (!hasPermission(req.user, permission)) {
      logger.security("权限不足", {
        userId: req.user.id,
        userRole: req.user.role,
        requiredPermission: permission,
        url: req.originalUrl,
        method: req.method,
        ip: req.ip,
      });

      return next(permissionError(`权限不足，需要权限: ${permission}`));
    }

    next();
  };
};

// 内容所有者或有权限验证
const requireContentPermission = (permission) => {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return next(authError("请先登录"));
      }

      // 检查是否有对应权限
      if (hasPermission(req.user, permission)) {
        return next();
      }

      // 检查是否是内容所有者
      const contentId = req.params.id;
      if (contentId) {
        const { Content } = require("../models");
        const content = await Content.findByPk(contentId);

        if (content && content.user_id === req.user.id) {
          return next();
        }
      }

      return next(permissionError("权限不足，只能操作自己的内容"));
    } catch (error) {
      next(error);
    }
  };
};

module.exports = {
  generateTokens,
  verifyToken,
  optionalAuth,
  requireRole,
  requireOwnership,
  requireEmailVerified,
  requireActiveAccount,
  requireUploadPermission,
  loginLimiter,
  registerLimiter,
  verificationLimiter,
  apiLimiter,
  refreshToken,
  blacklistToken,
  passportAuth,
  requireAuth: verifyToken, // 别名
  // 新增的权限控制
  PERMISSIONS,
  ROLE_PERMISSIONS,
  hasPermission,
  requirePermission,
  requireContentPermission,
};
