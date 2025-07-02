const express = require("express");
const http = require("http");
const path = require("path");
const cors = require("cors");
const helmet = require("helmet");
const compression = require("compression");
const morgan = require("morgan");
const rateLimit = require("express-rate-limit");
const socketIo = require("socket.io");
require("dotenv").config();

// 导入配置
const dbConfig = require("./config/database");

// 导入路由
const authRoutes = require("./routes/auth");
const contentRoutes = require("./routes/content");
const commentRoutes = require("./routes/comment");
const notificationRoutes = require("./routes/notification");
const todoRoutes = require("./routes/todo");
const uploadRoutes = require("./routes/upload");
const userRoutes = require("./routes/user");
const searchRoutes = require("./routes/search");
const chatRoutes = require("./routes/chat");
const mobileRoutes = require("./routes/mobile");

// 导入中间件
const authMiddleware = require("./middlewares/auth");
const { errorHandler } = require("./middlewares/errorHandler");
const logger = require("./utils/logger");

// 导入服务
const socketService = require("./services/socketService");
const emailService = require("./services/emailService");
const cronService = require("./services/cronService");

// 创建Express应用
const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: process.env.NODE_ENV === "production" ? false : "*",
    methods: ["GET", "POST"],
  },
});

// 基础配置
const PORT = process.env.PORT || 3000;
const NODE_ENV = process.env.NODE_ENV || "development";

// 安全中间件
app.use(
  helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
  })
);

// CORS配置
app.use(
  cors({
    origin:
      NODE_ENV === "production"
        ? [process.env.APP_URL, process.env.STATIC_URL]
        : ["http://localhost:3000", "http://localhost:3001", "http://localhost:8080"],
    credentials: true,
  })
);

// 压缩中间件
app.use(compression());

// 请求日志
app.use(morgan(NODE_ENV === "production" ? "combined" : "dev"));

// 请求限制
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
  message: {
    error: "请求过于频繁，请稍后再试",
    code: "RATE_LIMIT_EXCEEDED",
  },
});
app.use("/api/", limiter);

// 解析请求体
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// 静态文件服务
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// 静态站点支持
if (process.env.ENABLE_STATIC_SITE === "true") {
  const staticPath = process.env.STATIC_SITE_PATH || "./public";
  app.use(express.static(path.join(__dirname, staticPath)));
  logger.info(`静态站点已启用，路径: ${staticPath}`);
}

// API文档
if (NODE_ENV === "development") {
  const swaggerUi = require("swagger-ui-express");
  const swaggerSpec = require("./docs/swagger.json");
  app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));
}

// API路由
app.use("/api/auth", authRoutes);
app.use("/api/content", contentRoutes);
app.use("/api/comments", commentRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/todos", todoRoutes);
app.use("/api/upload", uploadRoutes);
app.use("/api/users", userRoutes);
app.use("/api/search", searchRoutes);
app.use("/api/chats", chatRoutes);
app.use("/api/mobile", mobileRoutes);

// 健康检查端点
app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: process.env.npm_package_version || "1.0.0",
    environment: NODE_ENV,
  });
});

// 详细的API状态检查
app.get("/api/status", async (req, res) => {
  try {
    const { sequelize } = require("./models");

    // 检查数据库连接
    let dbStatus = "ok";
    let dbLatency = 0;
    try {
      const startTime = Date.now();
      await sequelize.authenticate();
      dbLatency = Date.now() - startTime;
    } catch (error) {
      dbStatus = "error";
      logger.error("数据库连接检查失败:", error);
    }

    // 检查内存使用
    const memUsage = process.memoryUsage();

    res.json({
      status: "ok",
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: process.env.npm_package_version || "1.0.0",
      environment: NODE_ENV,
      database: {
        status: dbStatus,
        latency: `${dbLatency}ms`,
      },
      memory: {
        rss: `${Math.round(memUsage.rss / 1024 / 1024)}MB`,
        heapTotal: `${Math.round(memUsage.heapTotal / 1024 / 1024)}MB`,
        heapUsed: `${Math.round(memUsage.heapUsed / 1024 / 1024)}MB`,
        external: `${Math.round(memUsage.external / 1024 / 1024)}MB`,
      },
    });
  } catch (error) {
    logger.error("API状态检查失败:", error);
    res.status(500).json({
      status: "error",
      message: "状态检查失败",
      error: error.message,
    });
  }
});

// 静态站点路由（SPA支持）
if (process.env.ENABLE_STATIC_SITE === "true") {
  app.get("*", (req, res, next) => {
    // 如果是API请求，跳过静态文件处理
    if (req.path.startsWith("/api/") || req.path.startsWith("/uploads/")) {
      return next();
    }

    const staticPath = process.env.STATIC_SITE_PATH || "./public";
    const indexPath = path.join(__dirname, staticPath, "index.html");

    res.sendFile(indexPath, (err) => {
      if (err) {
        res.status(404).json({ error: "页面不存在" });
      }
    });
  });
}

// 404处理
app.use("*", (req, res) => {
  res.status(404).json({
    error: "接口不存在",
    path: req.originalUrl,
    method: req.method,
  });
});

// 错误处理中间件
app.use(errorHandler);

// Socket.IO服务
socketService.initialize(io);

// 创建默认数据（首次运行时）
async function createDefaultData() {
  try {
    logger.info("📝 开始创建默认数据...");
    const { User, Category, Tag } = require("./models");

    // 创建默认管理员用户
    await User.create({
      username: "admin",
      email: "admin@hm.com",
      password: "123456", // 会被自动加密
      nickname: "系统管理员",
      role: "admin",
      status: "active",
      email_verified: true,
      bio: "系统管理员账户",
      location: "中国",
    });
    logger.info("👤 默认管理员用户创建成功");

    // 创建默认分类
    const categories = [
      { name: "前端开发", slug: "frontend", description: "前端技术相关内容", icon: "🎨" },
      { name: "后端开发", slug: "backend", description: "后端技术相关内容", icon: "⚙️" },
      { name: "移动开发", slug: "mobile", description: "移动端开发相关内容", icon: "📱" },
      { name: "人工智能", slug: "ai", description: "AI和机器学习相关内容", icon: "🤖" },
      { name: "数据库", slug: "database", description: "数据库相关内容", icon: "🗄️" },
      { name: "运维部署", slug: "devops", description: "运维和部署相关内容", icon: "🚀" },
      { name: "求职面试", slug: "interview", description: "求职和面试相关内容", icon: "💼" },
      { name: "工具资源", slug: "tools", description: "开发工具和资源分享", icon: "🔧" },
    ];

    await Category.bulkCreate(categories);
    logger.info("📂 默认分类创建成功");

    // 创建默认标签
    const tags = [
      "JavaScript",
      "TypeScript",
      "React",
      "Vue",
      "Node.js",
      "Python",
      "Java",
      "Go",
      "Rust",
      "PHP",
      "MySQL",
      "MongoDB",
      "PostgreSQL",
      "SQLite",
      "Docker",
      "Kubernetes",
      "AWS",
      "nginx",
      "HTML",
      "CSS",
      "Webpack",
      "Vite",
      "Next.js",
      "算法",
      "数据结构",
      "系统设计",
      "性能优化",
    ];

    const tagData = tags.map((name) => ({
      name,
      // 移除slug字段，让模型的钩子自动生成
    }));

    await Tag.bulkCreate(tagData);
    logger.info("🏷️  默认标签创建成功");

    logger.info("🎉 默认数据创建完成！");
  } catch (error) {
    logger.error("❌ 创建默认数据失败:", error.message);
    logger.error("详细错误信息:", error);
    // 不要让默认数据创建失败影响服务启动
  }
}

// 检查并创建缺失的默认数据
async function checkAndCreateDefaultData() {
  try {
    const { User, Category, Tag } = require("./models");

    // 检查默认管理员
    const adminExists = await User.findOne({ where: { email: "admin@hm.com" } });
    if (!adminExists) {
      await User.create({
        username: "admin",
        email: "admin@hm.com",
        password: "123456",
        nickname: "系统管理员",
        role: "admin",
        status: "active",
        email_verified: true,
        bio: "系统管理员账户",
        location: "中国",
      });
      logger.info("👤 默认管理员用户已补充创建");
    }

    // 检查分类数量
    const categoryCount = await Category.count();
    if (categoryCount === 0) {
      const categories = [
        { name: "前端开发", slug: "frontend", description: "前端技术相关内容", icon: "🎨" },
        { name: "后端开发", slug: "backend", description: "后端技术相关内容", icon: "⚙️" },
        { name: "移动开发", slug: "mobile", description: "移动端开发相关内容", icon: "📱" },
        { name: "人工智能", slug: "ai", description: "AI和机器学习相关内容", icon: "🤖" },
        { name: "数据库", slug: "database", description: "数据库相关内容", icon: "🗄️" },
        { name: "运维部署", slug: "devops", description: "运维和部署相关内容", icon: "🚀" },
        { name: "求职面试", slug: "interview", description: "求职和面试相关内容", icon: "💼" },
        { name: "工具资源", slug: "tools", description: "开发工具和资源分享", icon: "🔧" },
      ];
      await Category.bulkCreate(categories);
      logger.info("📂 默认分类已补充创建");
    }

    // 检查标签数量
    const tagCount = await Tag.count();
    if (tagCount === 0) {
      const tags = [
        "JavaScript",
        "TypeScript",
        "React",
        "Vue",
        "Node.js",
        "Python",
        "Java",
        "Go",
        "Rust",
        "PHP",
        "MySQL",
        "MongoDB",
        "PostgreSQL",
        "SQLite",
        "Docker",
        "Kubernetes",
        "AWS",
        "nginx",
        "HTML",
        "CSS",
        "Webpack",
        "Vite",
        "Next.js",
        "算法",
        "数据结构",
        "系统设计",
        "性能优化",
      ];

      const tagData = tags.map((name) => ({
        name,
        // 移除slug字段，让模型的钩子自动生成
      }));

      await Tag.bulkCreate(tagData);
      logger.info("🏷️  默认标签已补充创建");
    }
  } catch (error) {
    logger.error("❌ 检查默认数据失败:", error.message);
    logger.error("详细错误信息:", error);
    // 不要让默认数据检查失败影响服务启动
  }
}

// 初始化数据库连接
async function initializeDatabase() {
  try {
    const { sequelize } = require("./models");

    // 测试数据库连接
    await sequelize.authenticate();
    logger.info("🔗 数据库连接成功");

    // 检查数据库表是否存在，不存在则创建，存在则同步结构
    const queryInterface = sequelize.getQueryInterface();
    const tables = await queryInterface.showAllTables();

    if (tables.length === 0) {
      logger.info("📦 首次运行，创建数据库表结构...");
      await sequelize.sync({ force: false });
      logger.info("✅ 数据库表结构创建完成");

      // 创建默认数据
      await createDefaultData();
    } else {
      logger.info("🔄 同步数据库表结构...");
      await sequelize.sync({ alter: false });
      logger.info("✅ 数据库表结构同步完成");

      // 检查是否需要创建默认数据
      await checkAndCreateDefaultData();
    }
  } catch (error) {
    logger.error("❌ 数据库初始化失败:", error.message);
    process.exit(1);
  }
}

// 检查和创建默认数据

// 启动服务器
async function startServer() {
  try {
    // 初始化数据库
    await initializeDatabase();

    // 启动定时任务
    cronService.start();

    // 启动HTTP服务器
    server.listen(PORT, () => {
      logger.info(`🎉 HM程序员社区服务启动成功！`);
      logger.info(`📋 运行环境: ${NODE_ENV}`);
      logger.info(`🌐 服务端口: ${PORT}`);
      logger.info(`📚 API文档: http://localhost:${PORT}/api-docs`);
      logger.info(`🧪 API测试: http://localhost:${PORT}/api-test.html`);
      logger.info(`🏠 官网首页: http://localhost:${PORT}`);
      logger.info(`💚 健康检查: http://localhost:${PORT}/health`);

      console.log(`\n${"=".repeat(60)}`);
      console.log(`🚀 HM程序员社区后台服务已启动`);
      console.log(`📍 访问地址: http://localhost:${PORT}`);
      console.log(`📖 完整文档: 查看 README.md 和 QUICK_START.md`);
      console.log(`${"=".repeat(60)}\n`);
    });

    // 优雅关闭
    process.on("SIGTERM", gracefulShutdown);
    process.on("SIGINT", gracefulShutdown);
  } catch (error) {
    logger.error("服务器启动失败:", error);
    process.exit(1);
  }
}

// 优雅关闭函数
async function gracefulShutdown(signal) {
  logger.info(`收到 ${signal} 信号，开始优雅关闭...`);

  // 停止接收新请求
  server.close(async () => {
    logger.info("HTTP服务器已关闭");

    try {
      // 关闭数据库连接
      const { sequelize } = require("./models");
      await sequelize.close();
      logger.info("数据库连接已关闭");

      // 停止定时任务
      cronService.stop();
      logger.info("定时任务已停止");

      logger.info("优雅关闭完成");
      process.exit(0);
    } catch (error) {
      logger.error("优雅关闭时发生错误:", error);
      process.exit(1);
    }
  });

  // 设置强制退出超时
  setTimeout(() => {
    logger.error("优雅关闭超时，强制退出");
    process.exit(1);
  }, 10000);
}

// 启动应用
startServer();

module.exports = app;
