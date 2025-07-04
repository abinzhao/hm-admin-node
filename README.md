# Node 后台服务 DEMO

## 项目简介

本项目为一个基于 Node.js + MySQL 的后端服务，支持用户、内容、软件、评论、通知、代办事项等模块，适用于内容社区、知识管理等场景。

## 主要功能模块

- 用户注册、登录、信息管理、华为账号支持
- 文章/问答/代码片段内容管理
- 移动端软件管理（含包名、icon、下载等）
- 评论、通知、代办事项
- 文件上传（图片、.hap、.zip 等）
- 统一接口响应、权限控制

## 技术栈

- Node.js (Express)
- MySQL（Sequelize ORM）
- JWT 认证
- Multer（文件上传）
- dotenv（环境变量）

## 目录结构说明

```
html/
├── README.md                # 项目说明文档
├── package.json             # 项目依赖与脚本
├── app.js                   # 应用入口
├── config/                  # 配置文件
│   └── db.js
├── routes/                  # 路由定义
│   ├── user.js
│   ├── content.js
│   ├── software.js
│   ├── comment.js
│   ├── notification.js
│   ├── todo.js
│   └── upload.js
├── controllers/             # 业务控制器
│   ├── userController.js
│   ├── contentController.js
│   ├── softwareController.js
│   ├── commentController.js
│   ├── notificationController.js
│   ├── todoController.js
│   └── uploadController.js
├── models/                  # 数据库模型
│   ├── user.js
│   ├── content.js
│   ├── software.js
│   ├── comment.js
│   ├── notification.js
│   ├── todo.js
│   └── index.js
├── middleware/              # 中间件
│   ├── auth.js
│   └── errorHandler.js
├── utils/                   # 工具函数
│   └── response.js
├── Files/                   # 文件上传存储目录
│   ├── images/
│   ├── packages/
│   └── other/
└── .env                     # 环境变量配置
```

## 安装与启动

1. 安装依赖：`npm install`
2. 配置数据库和环境变量：复制 `.env.example` 为 `.env` 并填写相关信息
3. 启动服务：`npm start`

## 接口响应规范

所有接口返回统一格式：

```json
{
  "code": 0,
  "msg": "操作成功",
  "data": { ... }
}
```

- code=0 表示成功，非 0 为错误码
- msg 为提示信息
- data 为返回数据

## 文件上传说明

- 上传接口：`POST /api/upload`
- 支持图片（images）、.hap/.zip（packages）、其他（other）
- 文件存储在 `Files/` 目录下对应子文件夹
- .hap 文件同名时，先保存新文件再删除旧文件，文件名保持一致
- 上传成功返回可访问的下载链接
