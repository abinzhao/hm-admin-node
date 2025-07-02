# HM程序员社区 API 文档

## 概述

HM程序员社区是一个专为鸿蒙应用开发者打造的技术交流平台，提供完整的后端API服务。本文档详细介绍了所有可用的API接口。

### 服务器信息

- **基础URL**: `http://localhost:3000/api`
- **协议**: HTTP/HTTPS
- **认证方式**: JWT Bearer Token
- **数据格式**: JSON

## 认证机制

### JWT Token

所有需要认证的接口都需要在请求头中包含有效的JWT Token：

```http
Authorization: Bearer <your-jwt-token>
```

### Token获取

通过登录或注册接口获取访问令牌：

- 访问令牌有效期：7天
- 刷新令牌有效期：30天

## API 模块分类

### 1. 用户认证模块 (`/api/auth`)

#### 1.1 用户注册

```http
POST /api/auth/register
```

**请求体**:

```json
{
  "username": "testuser",
  "email": "test@example.com",
  "password": "password123",
  "nickname": "测试用户",
  "phone": "13800138000"
}
```

#### 1.2 用户登录

```http
POST /api/auth/login
```

**请求体**:

```json
{
  "email": "test@example.com",
  "password": "password123"
}
```

#### 1.3 获取用户信息

```http
GET /api/auth/profile
```

#### 1.4 修改密码

```http
POST /api/auth/change-password
```

#### 1.5 短信验证码

```http
POST /api/auth/sms/send
```

#### 1.6 第三方登录

```http
GET /api/auth/oauth/{provider}/url
POST /api/auth/oauth/{provider}/callback
```

支持的提供商：`wechat`, `qq`, `weibo`

### 2. 用户管理模块 (`/api/users`)

#### 2.1 获取用户列表

```http
GET /api/users?page=1&limit=20
```

#### 2.2 获取用户详情

```http
GET /api/users/{userId}
```

#### 2.3 更新用户信息

```http
PUT /api/users/{userId}
```

#### 2.4 用户关注操作

```http
POST /api/users/{userId}/follow
DELETE /api/users/{userId}/follow
```

### 3. 内容管理模块 (`/api/content`)

#### 3.1 获取内容列表

```http
GET /api/content?type=article&page=1&limit=20
```

支持的内容类型：`article`, `question`, `snippet`

#### 3.2 创建内容

```http
POST /api/content
```

#### 3.3 获取内容详情

```http
GET /api/content/{contentId}
```

#### 3.4 更新内容

```http
PUT /api/content/{contentId}
```

#### 3.5 删除内容

```http
DELETE /api/content/{contentId}
```

#### 3.6 内容互动

```http
POST /api/content/{contentId}/like
POST /api/content/{contentId}/favorite
```

#### 3.7 分类和标签

```http
GET /api/content/categories
GET /api/content/tags
```

### 4. 评论系统 (`/api/comments`)

#### 4.1 获取评论列表

```http
GET /api/comments?target_type=content&target_id={contentId}
```

#### 4.2 创建评论

```http
POST /api/comments
```

#### 4.3 更新评论

```http
PUT /api/comments/{commentId}
```

#### 4.4 删除评论

```http
DELETE /api/comments/{commentId}
```

### 5. 实时聊天系统 (`/api/chats`)

#### 5.1 获取聊天列表

```http
GET /api/chats
```

#### 5.2 创建群聊

```http
POST /api/chats/group
```

#### 5.3 获取聊天详情

```http
GET /api/chats/{chatId}
```

#### 5.4 消息管理

```http
GET /api/chats/{chatId}/messages
POST /api/chats/{chatId}/messages
PUT /api/chats/{chatId}/messages/{messageId}
DELETE /api/chats/{chatId}/messages/{messageId}
```

#### 5.5 成员管理

```http
GET /api/chats/{chatId}/members
POST /api/chats/{chatId}/members
DELETE /api/chats/{chatId}/members/{userId}
```

#### 5.6 消息已读

```http
POST /api/chats/{chatId}/read
```

### 6. 移动端优化 (`/api/mobile`)

#### 6.1 首页数据聚合

```http
GET /api/mobile/home?include_chats=true&include_todos=true
```

#### 6.2 快速同步

```http
GET /api/mobile/sync?last_sync={timestamp}
```

#### 6.3 网络检测

```http
GET /api/mobile/network
```

#### 6.4 设备管理

```http
POST /api/mobile/device
```

#### 6.5 批量操作

```http
POST /api/mobile/batch
```

#### 6.6 轻量级搜索

```http
GET /api/mobile/search?keyword={keyword}&limit=5
```

### 7. 搜索功能 (`/api/search`)

#### 7.1 全局搜索

```http
GET /api/search?keyword={keyword}&page=1&limit=20
```

#### 7.2 高级搜索

```http
POST /api/search/advanced
```

#### 7.3 搜索建议

```http
GET /api/search/suggestions?keyword={keyword}
```

#### 7.4 热门搜索

```http
GET /api/search/trending
```

### 8. 通知系统 (`/api/notifications`)

#### 8.1 获取通知列表

```http
GET /api/notifications?page=1&limit=20
```

#### 8.2 获取未读数量

```http
GET /api/notifications/unread-count
```

#### 8.3 标记已读

```http
PUT /api/notifications/{notificationId}/read
POST /api/notifications/mark-all-read
```

### 9. 待办事项 (`/api/todos`)

#### 9.1 获取待办列表

```http
GET /api/todos?status=todo&page=1&limit=20
```

#### 9.2 创建待办事项

```http
POST /api/todos
```

#### 9.3 更新待办事项

```http
PUT /api/todos/{todoId}
```

#### 9.4 删除待办事项

```http
DELETE /api/todos/{todoId}
```

### 10. 文件上传 (`/api/upload`)

#### 10.1 获取上传配置

```http
GET /api/upload/config
```

#### 10.2 上传文件

```http
POST /api/upload/file
```

#### 10.3 获取文件列表

```http
GET /api/upload/files
```

#### 10.4 删除文件

```http
DELETE /api/upload/files/{fileId}
```

## WebSocket 实时通信

### 连接端点

```
ws://localhost:3000
```

### 支持的事件

#### 客户端发送事件

- `join_chat`: 加入聊天室
- `leave_chat`: 离开聊天室
- `send_message`: 发送消息
- `typing_start`: 开始输入
- `typing_stop`: 停止输入
- `message_read`: 消息已读

#### 服务器推送事件

- `new_message`: 新消息
- `message_read`: 消息已读回执
- `user_typing`: 用户正在输入
- `user_joined`: 用户加入
- `user_left`: 用户离开

## 状态码说明

### HTTP状态码

- `200 OK`: 请求成功
- `201 Created`: 资源创建成功
- `400 Bad Request`: 请求参数错误
- `401 Unauthorized`: 未认证或认证失败
- `403 Forbidden`: 权限不足
- `404 Not Found`: 资源不存在
- `422 Unprocessable Entity`: 数据验证失败
- `429 Too Many Requests`: 请求过于频繁
- `500 Internal Server Error`: 服务器内部错误

### 业务状态码

```json
{
  "success": true,
  "message": "操作成功",
  "code": "SUCCESS",
  "data": {...}
}
```

### 错误响应格式

```json
{
  "success": false,
  "message": "错误描述",
  "code": "ERROR_CODE",
  "errors": [...] // 详细错误信息（可选）
}
```

## 分页响应格式

```json
{
  "success": true,
  "data": {
    "items": [...],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 100,
      "totalPages": 5,
      "hasNext": true,
      "hasPrev": false
    }
  }
}
```

## 数据模型

### 用户模型 (User)

```json
{
  "id": 1,
  "username": "testuser",
  "email": "test@example.com",
  "nickname": "测试用户",
  "avatar": "https://example.com/avatar.jpg",
  "bio": "个人简介",
  "location": "北京",
  "role": "user",
  "status": "active",
  "level": 1,
  "points": 100,
  "email_verified": true,
  "last_login_at": "2024-01-01T00:00:00Z",
  "created_at": "2024-01-01T00:00:00Z",
  "updated_at": "2024-01-01T00:00:00Z"
}
```

### 内容模型 (Content)

```json
{
  "id": 1,
  "type": "article",
  "title": "文章标题",
  "slug": "article-slug",
  "summary": "文章摘要",
  "content": "文章内容",
  "cover_image": "https://example.com/cover.jpg",
  "category_id": 1,
  "tags": ["JavaScript", "Node.js"],
  "view_count": 100,
  "like_count": 10,
  "comment_count": 5,
  "status": "published",
  "published_at": "2024-01-01T00:00:00Z",
  "created_at": "2024-01-01T00:00:00Z",
  "updated_at": "2024-01-01T00:00:00Z",
  "author": {
    "id": 1,
    "nickname": "作者名称",
    "avatar": "https://example.com/avatar.jpg"
  }
}
```

### 聊天消息模型 (ChatMessage)

```json
{
  "id": 1,
  "chat_id": 1,
  "sender_id": 1,
  "type": "text",
  "content": "消息内容",
  "reply_to_id": null,
  "forwarded_from": null,
  "reactions": {},
  "is_edited": false,
  "is_deleted": false,
  "created_at": "2024-01-01T00:00:00Z",
  "sender": {
    "id": 1,
    "nickname": "发送者",
    "avatar": "https://example.com/avatar.jpg"
  }
}
```

## 开发环境配置

### 环境变量

详见 `docs/ENV_CONFIG.md` 文件

### 数据库配置

- 支持MySQL 5.7+
- 自动创建表结构
- 支持数据迁移

### 开发工具

- API测试工具：Postman、Insomnia
- WebSocket测试：postman-websocket、wscat
- 数据库管理：MySQL Workbench、phpMyAdmin

## 常见问题

### Q: 如何获取API访问权限？

A: 首先注册用户账号，然后通过登录接口获取JWT Token。

### Q: Token过期如何处理？

A: 使用刷新令牌endpoint刷新访问令牌，或重新登录。

### Q: 如何处理文件上传？

A: 使用multipart/form-data格式上传文件到`/api/upload/file`端点。

### Q: WebSocket连接如何认证？

A: 在连接握手时通过query参数传递JWT Token。

### Q: 如何实现实时通知？

A: 通过WebSocket连接监听相关事件，或定期轮询通知接口。

## 更新日志

### v1.0.0 (2024-07-02)

- 完整的用户认证系统
- 内容管理功能
- 实时聊天系统
- 移动端优化
- 第三方登录集成
- 文件上传功能
- 搜索系统
- 通知系统
- 待办事项管理

---

更多详细信息请参考项目中的其他文档文件：

- `ENV_CONFIG.md`: 环境配置说明
- `TROUBLESHOOTING.md`: 故障排除指南
- `FEATURE_SUMMARY.md`: 功能特性说明
