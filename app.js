// app.js
// 应用入口，初始化服务
const express = require("express");
const dotenv = require("dotenv");
const path = require("path");
const { errorHandler } = require("./middleware/errorHandler");
const { responseHandler } = require("./utils/response");
const rateLimit = require("express-rate-limit");
const { sequelize } = require("./models");

// 加载环境变量
dotenv.config();

const app = express();

// 解析 JSON 请求体
app.use(express.json());
// 解析 urlencoded 请求体
app.use(express.urlencoded({ extended: false }));

// 静态文件服务（用于文件下载）
app.use("/files", express.static(path.join(__dirname, "Files")));

// 统一响应处理
app.use(responseHandler);

// 限流配置：注册、登录、点赞、评论等接口
const authLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  message: { code: 429, msg: "操作过于频繁，请稍后再试", data: {} },
});
const likeLimiter = rateLimit({
  windowMs: 30 * 1000,
  max: 20,
  message: { code: 429, msg: "点赞/收藏操作过于频繁，请稍后再试", data: {} },
});
const commentLimiter = rateLimit({
  windowMs: 30 * 1000,
  max: 10,
  message: { code: 429, msg: "评论操作过于频繁，请稍后再试", data: {} },
});

// 路由加载
app.use("/api/user", require("./routes/user"));
app.use("/api/content", require("./routes/content"));
app.use("/api/software", require("./routes/software"));
app.use("/api/comment", require("./routes/comment"));
app.use("/api/notification", require("./routes/notification"));
app.use("/api/todo", require("./routes/todo"));
app.use("/api/upload", require("./routes/upload"));

// 用户注册、登录限流
app.use("/api/user/register", authLimiter);
app.use("/api/user/login", authLimiter);
// 内容点赞/收藏限流
app.use("/api/content/like", likeLimiter);
app.use("/api/content/collect", likeLimiter);
// 评论发布限流
app.use("/api/comment/create", commentLimiter);

// 错误处理中间件
app.use(errorHandler);

// 启动服务
const PORT = process.env.PORT || 3000;
(async () => {
  try {
    await sequelize.authenticate();
    // 控制台美化输出
    console.log("\n==============================");
    console.log("🚀 Node 后台服务 DEMO 启动成功!");
    console.log("📦 端口:         ", PORT);
    console.log("🗄️  数据库连接:   成功");
    console.log("📚 接口文档:     http://localhost:" + PORT + "/docs/api.md");
    console.log("==============================\n");
    app.listen(PORT, () => {
      // 端口监听已在上方输出
    });
  } catch (err) {
    console.error("❌ 数据库连接失败:", err.message);
    process.exit(1);
  }
})();
