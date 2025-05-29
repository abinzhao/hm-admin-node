# 多功能后台服务器项目

## 项目概述

本项目是一个多功能后台服务器，主要用于管理用户和内容数据，同时支持远程手机调试功能。服务器采用模块化设计，支持高并发场景下的稳定运行，并确保数据安全和系统可靠性。

## 主要功能

- **用户管理**：包括用户注册、登录、信息修改、头像和密码更新等功能。
- **内容管理**：支持文章、问答、代码片段和软件包的增删改查操作。
- **代办事项**：管理用户的个人代办任务。
- **留言功能**：为各类内容提供留言评论服务。
- **系统公告**：发布和管理系统通知。
- **TCP服务**：实现与远程手机的通信，支持无线调试功能。

## 技术栈

- **后端框架**：Express.js
- **数据库**：MySQL
- **身份验证**：JWT
- **密码加密**：bcrypt
- **日志记录**：winston
- **TCP服务**：Node.js net模块
- **HDC工具**：用于与远程手机通信

## 项目结构
src/
├── api/                    # API接口层
│   ├── auth/               # 认证接口
│   ├── users/              # 用户管理接口
│   ├── content/            # 内容管理接口
│   ├── todos/              # 代办事项接口
│   ├── comments/           # 留言管理接口
│   └── announcements/      # 系统公告接口
├── config/                 # 配置文件
│   ├── env/                # 环境配置
│   ├── database.js         # 数据库配置
│   ├── jwt.js              # JWT配置
│   └── tcp.js              # TCP服务配置
├── middleware/             # 中间件
│   ├── auth.js             # 认证中间件
│   ├── csrf.js             # CSRF防护中间件
│   └── errorHandler.js     # 错误处理中间件
├── models/                 # 数据模型
│   ├── user.js             # 用户模型
│   ├── article.js          # 文章模型
│   ├── question.js         # 问答模型
│   ├── codeSnippet.js      # 代码片段模型
│   ├── softwarePackage.js  # 软件包模型
│   ├── todo.js             # 代办事项模型
│   ├── comment.js          # 留言模型
│   └── announcement.js     # 系统公告模型
├── services/               # 业务逻辑层
│   ├── authService.js      # 认证服务
│   ├── userService.js      # 用户服务
│   ├── contentService.js   # 内容服务
│   ├── todoService.js      # 代办服务
│   ├── commentService.js   # 留言服务
│   ├── announcementService.js # 公告服务
│   └── tcpService.js       # TCP服务
├── utils/                  # 工具函数
│   ├── encryption.js       # 加密工具
│   ├── logger.js           # 日志工具
│   └── validator.js        # 验证工具
├── app.js                  # Express应用配置
├── tcpServer.js            # TCP服务器
└── server.js               # HTTP服务器入口
## 安装与运行

### 环境要求

- Node.js (v14+)
- MySQL (v5.7+)
- HDC工具 (用于TCP服务)

### 安装依赖
npm install
### 配置环境变量

创建 `.env` 文件，配置以下环境变量：
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=server_db
PORT=3000
TCP_PORT=8888
JWT_SECRET=your-secret-key
HDC_PATH=hdc
LOG_LEVEL=info
### 初始化数据库
npm run init-db
### 启动服务器
npm start
## API文档

完整的API文档可以在项目根目录下的 `docs/` 文件夹中找到，或通过Swagger UI访问。

## 测试
npm test
## 部署

推荐使用Docker容器化部署，或使用PM2进行进程管理。

## 贡献

欢迎提交问题和拉取请求。

## 许可证

本项目采用MIT许可证。