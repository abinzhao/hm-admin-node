# HM程序员社区 - 专业的技术交流平台

[![Node.js](https://img.shields.io/badge/Node.js-18+-green.svg)](https://nodejs.org/)
[![Express.js](https://img.shields.io/badge/Express.js-4.x-blue.svg)](https://expressjs.com/)
[![MySQL](https://img.shields.io/badge/MySQL-8.0-orange.svg)](https://www.mysql.com/)
[![License](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

HM程序员社区是一个基于 Node.js + Express + MySQL 构建的现代化技术交流平台，致力于为全球程序员提供优质的学习和交流环境。

## 🌟 项目特色

### 🎯 功能完整

- **用户管理系统**：注册、登录、权限控制、资料管理
- **内容管理**：文章、问答、代码片段发布与管理
- **社区互动**：点赞、收藏、评论、关注功能
- **分类标签**：完善的分类和标签系统
- **搜索功能**：全文搜索和智能推荐
- **管理后台**：用户管理、内容审核、数据统计

### 🏗️ 架构先进

- **分层架构**：清晰的 MVC 架构设计
- **模块化设计**：组件化开发，易于维护
- **RESTful API**：标准化的接口设计
- **JWT认证**：安全的无状态认证机制
- **数据库ORM**：使用 Sequelize 进行数据管理

### 🛡️ 安全可靠

- **请求限流**：防止恶意请求和DDoS攻击
- **数据验证**：严格的输入验证和过滤
- **错误处理**：完善的错误处理机制
- **日志记录**：详细的操作日志和监控
- **密码加密**：使用 bcrypt 加密用户密码

## 🛠️ 技术栈

### 后端技术

- **运行环境**：Node.js 18+
- **Web框架**：Express.js 4.x
- **数据库**：MySQL 8.0
- **ORM框架**：Sequelize 6.x
- **身份认证**：JWT (jsonwebtoken)
- **密码加密**：bcryptjs
- **实时通信**：Socket.io
- **邮件服务**：Nodemailer
- **任务调度**：node-cron
- **日志系统**：Winston
- **API文档**：Swagger (OpenAPI 3.0)

### 开发工具

- **代码风格**：ESLint + Prettier
- **API测试**：内置测试界面
- **文档生成**：Swagger UI
- **版本控制**：Git

## 📋 系统要求

### 必需环境

- Node.js >= 18.0.0
- MySQL >= 8.0
- npm >= 8.0.0

### 推荐配置

- 内存：>= 2GB RAM
- 硬盘：>= 10GB 可用空间
- 网络：稳定的互联网连接

## 🚀 快速开始

### 1. 克隆项目

```bash
git clone https://github.com/hm-community/node-service.git
cd node-service
```

### 2. 安装依赖

```bash
npm install
```

### 3. 环境配置

创建 `.env` 文件并配置以下参数：

```env
# 服务器配置
NODE_ENV=development
PORT=3001

# 数据库配置
DB_HOST=localhost
DB_PORT=3306
DB_NAME=hm_community
DB_USER=root
DB_PASSWORD=

# JWT配置
JWT_SECRET=your-super-secret-jwt-key-here
JWT_EXPIRES_IN=7d
JWT_REFRESH_EXPIRES_IN=30d

# 邮件配置（可选）
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=your-email@example.com
SMTP_PASS=your-email-password

# 其他配置
FRONTEND_URL=http://localhost:3000
ENABLE_STATIC_SITE=true
```

### 4. 数据库初始化

确保 MySQL 服务运行，然后创建数据库：

```sql
CREATE DATABASE hm_community CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

### 5. 启动服务

```bash
npm start
```

服务启动后，访问以下地址：

- **官网首页**：http://localhost:3001
- **API文档**：http://localhost:3001/api-docs
- **API测试**：http://localhost:3001/api-test.html
- **健康检查**：http://localhost:3001/health

## 📚 API 文档

### 认证接口

| 方法 | 端点                        | 描述         |
| ---- | --------------------------- | ------------ |
| POST | `/api/auth/register`        | 用户注册     |
| POST | `/api/auth/login`           | 用户登录     |
| POST | `/api/auth/logout`          | 用户登出     |
| GET  | `/api/auth/profile`         | 获取用户信息 |
| POST | `/api/auth/refresh-token`   | 刷新令牌     |
| POST | `/api/auth/forgot-password` | 忘记密码     |
| POST | `/api/auth/reset-password`  | 重置密码     |

### 内容接口

| 方法   | 端点                        | 描述          |
| ------ | --------------------------- | ------------- |
| GET    | `/api/content`              | 获取内容列表  |
| POST   | `/api/content`              | 创建内容      |
| GET    | `/api/content/:id`          | 获取内容详情  |
| PUT    | `/api/content/:id`          | 更新内容      |
| DELETE | `/api/content/:id`          | 删除内容      |
| POST   | `/api/content/:id/like`     | 点赞/取消点赞 |
| POST   | `/api/content/:id/favorite` | 收藏/取消收藏 |

完整的API文档请访问：[http://localhost:3001/api-docs](http://localhost:3001/api-docs)

## 🗂️ 项目结构

```
node-service/
├── app.js                 # 应用入口文件
├── package.json           # 项目依赖配置
├── .env.example          # 环境变量示例
├── README.md             # 项目说明文档
├── QUICK_START.md        # 快速启动指南
├── config/               # 配置文件
│   ├── database.js       # 数据库配置
│   └── passport.js       # 认证配置
├── controllers/          # 控制器
│   ├── authController.js # 认证控制器
│   └── contentController.js # 内容控制器
├── models/               # 数据模型
│   ├── index.js         # 模型入口
│   ├── User.js          # 用户模型
│   ├── Content.js       # 内容模型
│   ├── Category.js      # 分类模型
│   └── ...              # 其他模型
├── routes/               # 路由定义
│   ├── auth.js          # 认证路由
│   └── content.js       # 内容路由
├── middlewares/          # 中间件
│   ├── auth.js          # 认证中间件
│   └── errorHandler.js  # 错误处理中间件
├── services/             # 业务服务
│   ├── emailService.js  # 邮件服务
│   ├── cronService.js   # 定时任务服务
│   └── socketService.js # WebSocket服务
├── utils/                # 工具函数
│   ├── helpers.js       # 辅助函数
│   ├── logger.js        # 日志工具
│   └── validation.js    # 数据验证
├── public/               # 静态资源
│   ├── index.html       # 官网首页
│   └── api-test.html    # API测试页面
├── docs/                 # 文档
│   └── swagger.json     # API文档配置
├── templates/            # 邮件模板
│   ├── welcome.html     # 欢迎邮件
│   └── ...              # 其他模板
├── scripts/              # 脚本文件
│   └── init-database.js # 数据库初始化脚本
├── logs/                 # 日志文件
└── uploads/              # 上传文件
```

## 🔧 开发指南

### 启动开发环境

```bash
# 开发模式启动（支持热重载）
npm run dev

# 生产模式启动
npm start

# 运行测试
npm test

# 代码格式检查
npm run lint

# 代码格式化
npm run format
```

### 数据库管理

```bash
# 同步数据库结构
npm run db:sync

# 创建数据库迁移
npm run db:migrate

# 回滚数据库迁移
npm run db:rollback

# 填充测试数据
npm run db:seed
```

### 环境变量说明

| 变量名         | 必需 | 默认值       | 说明         |
| -------------- | ---- | ------------ | ------------ |
| NODE_ENV       | 否   | development  | 运行环境     |
| PORT           | 否   | 3001         | 服务端口     |
| DB_HOST        | 是   | localhost    | 数据库主机   |
| DB_PORT        | 否   | 3306         | 数据库端口   |
| DB_NAME        | 是   | hm_community | 数据库名称   |
| DB_USER        | 是   | root         | 数据库用户名 |
| DB_PASSWORD    | 是   |              | 数据库密码   |
| JWT_SECRET     | 是   |              | JWT签名密钥  |
| JWT_EXPIRES_IN | 否   | 7d           | JWT过期时间  |

## 📊 系统监控

### 健康检查

访问 `/health` 端点获取系统状态：

```json
{
  "status": "ok",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "uptime": 86400,
  "environment": "development",
  "version": "1.0.0",
  "database": "connected",
  "memory": {
    "used": "50.2 MB",
    "free": "1.94 GB"
  }
}
```

### 日志记录

系统自动记录以下日志：

- **访问日志**：HTTP请求和响应
- **错误日志**：应用程序错误和异常
- **安全日志**：认证失败和可疑操作
- **性能日志**：慢查询和资源使用情况

日志文件位置：`logs/` 目录

## 🚀 部署指南

### Docker 部署

```bash
# 构建Docker镜像
docker build -t hm-community .

# 运行容器
docker run -d -p 3001:3001 --name hm-community hm-community
```

### PM2 部署

```bash
# 安装PM2
npm install -g pm2

# 启动应用
pm2 start app.js --name hm-community

# 查看状态
pm2 status

# 查看日志
pm2 logs hm-community
```

### Nginx 反向代理

```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

## 🤝 贡献指南

我们欢迎所有形式的贡献！请查看 [CONTRIBUTING.md](CONTRIBUTING.md) 了解详细信息。

### 开发流程

1. Fork 项目
2. 创建功能分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 开启 Pull Request

### 代码规范

- 使用 ESLint 进行代码检查
- 遵循 JavaScript Standard Style
- 编写清晰的注释和文档
- 添加适当的测试用例

## 📄 许可证

本项目采用 MIT 许可证 - 查看 [LICENSE](LICENSE) 文件了解详情。

## 🆘 技术支持

### 常见问题

查看 [FAQ.md](docs/FAQ.md) 获取常见问题解答。

### 问题反馈

- **Bug报告**：[GitHub Issues](https://github.com/hm-community/node-service/issues)
- **功能请求**：[GitHub Discussions](https://github.com/hm-community/node-service/discussions)
- **邮件联系**：admin@hm.com

### 社区支持

- **官方网站**：https://hm-community.com
- **技术文档**：https://docs.hm-community.com
- **社区论坛**：https://forum.hm-community.com

## 🎯 路线图

### v1.1.0 计划

- [ ] 评论系统完善
- [ ] 全文搜索功能
- [ ] 实时通知系统
- [ ] 移动端API优化

### v1.2.0 计划

- [ ] 多语言支持
- [ ] 主题定制功能
- [ ] 数据导出功能
- [ ] 高级权限管理

### v2.0.0 计划

- [ ] 微服务架构重构
- [ ] GraphQL API支持
- [ ] 机器学习推荐系统
- [ ] 分布式部署支持

## 📈 更新日志

### v1.0.0 (2024-01-01)

- ✨ 初始版本发布
- 🎉 完整的用户管理系统
- 📝 内容管理功能
- 🔐 JWT认证机制
- 📚 完整的API文档
- 🧪 在线API测试工具

---

<div align="center">

**[官网](https://hm-community.com)** •
**[文档](https://docs.hm-community.com)** •
**[API](http://localhost:3001/api-docs)** •
**[演示](http://localhost:3001)**

Made with ❤️ by HM Community Team

</div>
