# HMOS后台服务器API文档

## 基础信息
- 服务器地址：http://localhost:3000
- TCP服务端口：3001
- 所有接口返回格式：`{status: number, message: string, data: any}`

## 认证说明
- 除登录、注册、查询接口外，其他接口需要在请求头中携带token
- 请求头格式：`Authorization: Bearer <token>`

---

## 用户相关接口

### 用户注册
**POST** `/hmos-app/user/register`

**入参：**
```json
{
  "username": "testuser",
  "password": "123456",
  "nickname": "测试用户",
  "email": "test@example.com",
  "phone": "13800138000"
}
```

**返回：**
```json
{
  "status": 200,
  "message": "注册成功",
  "data": {
    "userId": "user_1640995200000"
  }
}
```

### 用户登录
**POST** `/hmos-app/user/login`

**入参：**
```json
{
  "username": "testuser",
  "password": "123456"
}
```

**返回：**
```json
{
  "status": 200,
  "message": "登录成功",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "userInfo": {
      "id": 1,
      "userId": "user_001",
      "username": "testuser",
      "nickname": "测试用户",
      "role": "user",
      "phone": "13800138000",
      "tags": ["新用户"],
      "email": "test@example.com",
      "description": null,
      "openId": null,
      "avatar": null,
      "createTime": "2025-01-01 12:00:00"
    }
  }
}
```

### 查询单个用户信息
**GET** `/hmos-app/user/:userId`

**返回：**
```json
{
  "status": 200,
  "message": "操作成功",
  "data": {
    "id": 1,
    "userId": "user_001",
    "username": "testuser",
    "nickname": "测试用户",
    "role": "user",
    "phone": "13800138000",
    "tags": ["新用户"],
    "email": "test@example.com",
    "description": "这是一个测试用户",
    "openId": null,
    "avatar": "https://example.com/avatar.jpg",
    "createTime": "2025-01-01 12:00:00"
  }
}
```

### 查询所有用户信息（分页）
**GET** `/hmos-app/user?page=1&limit=10`

**返回：**
```json
{
  "status": 200,
  "message": "操作成功",
  "data": {
    "list": [...],
    "total": 100,
    "page": 1,
    "limit": 10
  }
}
```

### 修改用户信息
**PUT** `/hmos-app/user/:userId`

**入参：**
```json
{
  "nickname": "新昵称",
  "email": "new@example.com",
  "phone": "13900139000",
  "description": "更新的描述",
  "avatar": "https://example.com/new-avatar.jpg",
  "tags": ["标签1", "标签2"]
}
```

### 删除用户
**DELETE** `/hmos-app/user/:userId`

---

## 内容相关接口

### 新增内容
**POST** `/hmos-app/content`

**入参：**
```json
{
  "title": "文章标题",
  "description": "文章描述",
  "contentType": "文章",
  "tags": ["前端", "ArkUI"],
  "coverImage": [{"url": "https://example.com/cover.jpg"}],
  "content": "文章正文内容"
}
```

### 查询单个内容
**GET** `/hmos-app/content/:id`

### 查询某个用户下的所有内容（分页）
**GET** `/hmos-app/content/user/:userId?page=1&limit=10`

### 查询所有内容（分页）
**GET** `/hmos-app/content?page=1&limit=10&contentType=文章`

### 修改内容
**PUT** `/hmos-app/content/:id`

### 删除内容
**DELETE** `/hmos-app/content/:id`

---

## 应用相关接口

### 新增应用
**POST** `/hmos-app/app`

**入参：** (multipart/form-data)
```
packageName: "com.example.app"
appName: "示例应用"
description: "应用描述"
appLogo: "https://example.com/logo.jpg"
appDevType: "原始应用"
updateInfo: "版本更新信息"
appVersion: "1.0.0"
appSize: "50MB"
appType: "工具"
appScreenshot: "[\"https://example.com/screen1.jpg\"]"
appFile: <文件>
```

### 查询单个应用
**GET** `/hmos-app/app/:id`

### 查询某个用户下的所有应用（分页）
**GET** `/hmos-app/app/user/:userId?page=1&limit=10`

### 查询所有应用（分页）
**GET** `/hmos-app/app?page=1&limit=10&appType=工具`

### 修改应用
**PUT** `/hmos-app/app/:id`

### 删除应用
**DELETE** `/hmos-app/app/:id`

---

## 留言相关接口

### 新增留言
**POST** `/hmos-app/message`

**入参：**
```json
{
  "targetId": 1,
  "targetType": "content",
  "content": "这是一条留言"
}
```

### 查询某个内容/应用下的所有留言
**GET** `/hmos-app/message/:targetType/:targetId?page=1&limit=10`

### 修改留言
**PUT** `/hmos-app/message/:id`

### 删除留言
**DELETE** `/hmos-app/message/:id`

---

## 通知相关接口

### 新增通知（仅管理员）
**POST** `/hmos-app/notification`

**入参：**
```json
{
  "title": "系统维护通知",
  "content": "计划于2025-06-01进行系统升级"
}
```

### 查询通知（分页）
**GET** `/hmos-app/notification?page=1&limit=10`

### 修改通知（仅管理员）
**PUT** `/hmos-app/notification/:id`

### 删除通知（仅管理员）
**DELETE** `/hmos-app/notification/:id`

---

## 代办事项相关接口

### 新增代办
**POST** `/hmos-app/todo`

**入参：**
```json
{
  "title": "完成项目设计",
  "description": "完成React待办事项应用的设计稿",
  "priority": "high",
  "dueDate": "2025-06-01"
}
```

### 查询某个代办内容
**GET** `/hmos-app/todo/:id`

### 查询某个用户下的所有代办（分页）
**GET** `/hmos-app/todo/user/:userId?page=1&limit=10&status=pending`

### 查询所有用户的代办（分页，仅管理员）
**GET** `/hmos-app/todo?page=1&limit=10&status=pending`

### 修改代办
**PUT** `/hmos-app/todo/:id`

**入参：**
```json
{
  "title": "更新的标题",
  "description": "更新的描述",
  "status": "completed",
  "priority": "medium",
  "dueDate": "2025-06-15"
}
```

### 删除代办
**DELETE** `/hmos-app/todo/:id`

---

## 分类相关接口

### 新增分类（仅管理员）
**POST** `/hmos-app/category`

**入参：**
```json
{
  "type": "app",
  "title": "工具类"
}
```

### 查询所有分类
**GET** `/hmos-app/category?type=app`

### 修改分类（仅管理员）
**PUT** `/hmos-app/category/:id`

### 删除分类（仅管理员）
**DELETE** `/hmos-app/category/:id`

---

## TCP服务说明

### 连接方式
- 服务器地址：localhost:3001
- 协议：TCP
- 支持多客户端同时连接
- 每个客户端分配唯一ID

### 连接流程
1. 客户端连接到TCP服务器
2. 服务器分配客户端ID并发送欢迎消息
3. 客户端可发送命令或特殊指令
4. 服务器执行命令并返回结果
5. 客户端可主动断开连接

### 特殊命令
- `PING` - 心跳检测，返回PONG
- `STATUS` - 获取连接状态信息
- `DISCONNECT` - 主动断开连接

### adb/hdc命令示例
```bash
# 检测设备连接
adb devices

# 安装应用
adb install /path/to/app.apk

# 卸载应用
adb uninstall com.example.package

# HDC命令示例
hdc list targets
hdc install /path/to/app.hap
```

### 返回格式
- 连接成功：`CONNECTED: 欢迎连接到HMOS TCP服务器 [客户端ID: X]`
- 命令成功：`SUCCESS: <命令输出>`
- 命令错误：`ERROR: <错误信息>`
- 标准错误：`STDERR: <错误输出>`
- 广播消息：`BROADCAST: <消息内容>`
- 连接超时：`TIMEOUT: 连接超时，服务器主动断开连接`
- 主动断开：`BYE: 客户端主动断开连接`

### 连接管理
- 支持多客户端并发连接
- 每个连接独立处理，互不影响
- 自动检测连接状态和超时处理
- 支持服务器广播消息给所有客户端

---

## 日志相关接口

### 查询日志（分页，多维度查询）
**GET** `/hmos-app/log?page=1&limit=20&level=error&source=tcp&startDate=2025-01-01&endDate=2025-01-02&keyword=错误`

**查询参数：**
- `page`: 页码（默认1）
- `limit`: 每页数量（默认20）
- `level`: 日志级别（error, warn, info, debug）
- `source`: 日志来源（tcp, api, database, system）
- `startDate`: 开始时间（YYYY-MM-DD 或 YYYY-MM-DD HH:mm:ss）
- `endDate`: 结束时间（YYYY-MM-DD 或 YYYY-MM-DD HH:mm:ss）
- `keyword`: 关键词搜索

**返回：**
```json
{
  "status": 200,
  "message": "操作成功",
  "data": {
    "list": [
      {
        "id": 1,
        "level": "error",
        "message": "TCP连接错误",
        "meta": {
          "clientId": 1,
          "error": "Connection reset"
        },
        "timestamp": "2025-01-01 12:00:00",
        "source": "tcp",
        "createTime": "2025-01-01 12:00:00"
      }
    ],
    "total": 100,
    "page": 1,
    "limit": 20,
    "filters": {
      "level": "error",
      "source": "tcp",
      "startDate": "2025-01-01",
      "endDate": "2025-01-02",
      "keyword": "错误"
    }
  }
}
```

### 获取日志统计信息
**GET** `/hmos-app/log/stats?timeRange=24h`

**查询参数：**
- `timeRange`: 时间范围（24h, 7d, 30d）

**返回：**
```json
{
  "status": 200,
  "message": "操作成功",
  "data": {
    "timeRange": "24h",
    "total": 1500,
    "levelStats": [
      {"level": "info", "count": 1200},
      {"level": "error", "count": 200},
      {"level": "warn", "count": 80},
      {"level": "debug", "count": 20}
    ],
    "sourceStats": [
      {"source": "api", "count": 800},
      {"source": "tcp", "count": 400},
      {"source": "system", "count": 200},
      {"source": "database", "count": 100}
    ]
  }
}
```

### 删除日志
**DELETE** `/hmos-app/log`

**入参：**
```json
{
  "ids": [1, 2, 3],
  "beforeDate": "2025-01-01",
  "level": "error",
  "source": "tcp"
}
```

**说明：**
- `ids`: 指定删除的日志ID数组
- `beforeDate`: 删除指定日期之前的日志
- `level`: 删除指定级别的日志
- `source`: 删除指定来源的日志

### 清空所有日志
**DELETE** `/hmos-app/log/clear`

### 获取TCP服务状态
**GET** `/hmos-app/log/tcp-status`

**返回：**
```json
{
  "status": 200,
  "message": "操作成功",
  "data": {
    "isRunning": true,
    "totalClients": 3,
    "activeClients": [
      {
        "id": 1,
        "remoteAddress": "127.0.0.1",
        "remotePort": 54321,
        "connectTime": "2025-01-01T12:00:00.000Z",
        "connectionDuration": 300
      }
    ]
  }
}
```

### TCP服务广播消息
**POST** `/hmos-app/log/tcp-broadcast`

**入参：**
```json
{
  "message": "系统即将维护，请保存工作"
}
```

**返回：**
```json
{
  "status": 200,
  "message": "广播消息已发送给 3 个客户端",
  "data": {
    "sentCount": 3,
    "message": "系统即将维护，请保存工作"
  }
}
```

---

## 数据表结构

### 用户表 (users)
```json
{
  "id": 1,
  "userId": "user_001",
  "username": "admin-test",
  "nickname": "系统管理员",
  "role": "admin",
  "phone": "13800138000",
  "tags": ["社区贡献者", "技术专家", "管理员"],
  "email": "admin@163.com",
  "description": "这是一个测试用户",
  "openId": "hmos_open_001",
  "createTime": "2025-05-28",
  "avatar": "https://example.com/avatar.jpg"
}
```

### 内容表 (contents)
```json
{
  "id": 1,
  "userId": 111,
  "title": "文章标题",
  "description": "内容描述",
  "contentType": "文章",
  "tags": ["前端", "ArkUI"],
  "coverImage": [{"url": "https://example.com/cover.jpg"}],
  "content": "这是文章内容",
  "createTime": "2025-10-13 12:00:00",
  "updateTime": "2025-10-13 18:00:00"
}
```

### 应用表 (apps)
```json
{
  "id": 3,
  "userId": 111,
  "packageName": "com.example.wechat",
  "appName": "微信",
  "description": "这是一个微信应用的包",
  "appLogo": "https://example.com/logo.jpg",
  "appDevType": "原始应用",
  "updateInfo": "修复了一些bug，优化了性能",
  "appVersion": "1.0.0",
  "appSize": "150MB",
  "downloads": 10000,
  "appUrl": "/resources/apps/wechat.hap",
  "appType": "社交",
  "appScreenshot": [
    "https://example.com/screen1.jpg",
    "https://example.com/screen2.jpg"
  ],
  "createTime": "2025-10-13 12:00:00",
  "updateTime": "2025-10-13 18:00:00"
}
```

### 留言表 (messages)
```json
{
  "id": 1,
  "userId": 12345,
  "targetId": 1,
  "targetType": "content",
  "content": "太牛逼了",
  "createTime": "2025-10-13 12:00:00"
}
```

### 通知表 (notifications)
```json
{
  "id": 1,
  "title": "系统维护通知",
  "content": "计划于2025-06-01 00:00至03:00进行系统升级",
  "publisher": "系统管理员",
  "createTime": "2025-05-27",
  "updateTime": "2025-05-27"
}
```

### 代办事项表 (todos)
```json
{
  "id": 1,
  "userId": 111,
  "title": "完成项目设计",
  "description": "完成React待办事项应用的设计稿",
  "status": "pending",
  "priority": "high",
  "dueDate": "2025-06-01"
}
```

### 分类表 (categories)
```json
{
  "id": 1,
  "type": "app",
  "title": "工具类"
}
```

---

## 首页数据相关接口

### 首页统计数据
**GET** `/hmos-app/dashboard/stats`

**说明：** 根据用户角色返回不同的统计数据
- 普通用户：返回个人的文章、问答、代码片段、应用等统计
- 管理员：返回系统所有数据的统计

**返回（普通用户）：**
```json
{
  "status": 200,
  "message": "操作成功",
  "data": {
    "role": "user",
    "myStats": {
      "articles": 5,
      "qa": 3,
      "codeSnippets": 2,
      "apps": 1,
      "todos": 8,
      "pendingTodos": 3,
      "receivedMessages": 12
    },
    "contentStats": {
      "total": 10,
      "articles": 5,
      "qa": 3,
      "codeSnippets": 2
    }
  }
}
```

**返回（管理员）：**
```json
{
  "status": 200,
  "message": "操作成功",
  "data": {
    "role": "admin",
    "totalStats": {
      "articles": 150,
      "qa": 89,
      "codeSnippets": 45,
      "apps": 67,
      "users": 234,
      "messages": 567,
      "notifications": 12,
      "todos": 345
    },
    "todayStats": {
      "newUsers": 5,
      "newContents": 8,
      "newApps": 2
    },
    "contentStats": {
      "total": 284,
      "articles": 150,
      "qa": 89,
      "codeSnippets": 45
    }
  }
}
```

### 最近活动数据
**GET** `/hmos-app/dashboard/recent-activities?limit=10`

**查询参数：**
- `limit`: 返回数量限制（默认10）

**返回（普通用户）：**
```json
{
  "status": 200,
  "message": "操作成功",
  "data": {
    "myRecentContents": [...],
    "myRecentApps": [...],
    "myRecentTodos": [...]
  }
}
```

**返回（管理员）：**
```json
{
  "status": 200,
  "message": "操作成功",
  "data": {
    "recentContents": [...],
    "recentApps": [...],
    "recentUsers": [...]
  }
}
```

---

## 系统信息相关接口

### 获取系统信息（仅管理员）
**GET** `/hmos-app/system/info`

**返回：**
```json
{
  "status": 200,
  "message": "操作成功",
  "data": {
    "node": {
      "version": "v18.17.0",
      "platform": "darwin",
      "arch": "x64",
      "pid": 12345,
      "uptime": {
        "days": 0,
        "hours": 2,
        "minutes": 30,
        "seconds": 45
      },
      "uptimeSeconds": 9045
    },
    "database": {
      "type": "SQLite",
      "version": "3.42.0",
      "size": "15.6 MB",
      "path": "/path/to/HMOS-APP.db"
    },
    "system": {
      "hostname": "MacBook-Pro",
      "platform": "darwin",
      "arch": "x64",
      "release": "22.6.0",
      "type": "Darwin",
      "cpus": 8,
      "totalMemory": "16.00 GB",
      "freeMemory": "8.45 GB",
      "loadAverage": [1.2, 1.5, 1.8],
      "networkInterfaces": ["lo0", "en0", "en1"]
    },
    "memory": {
      "rss": "45.6 MB",
      "heapTotal": "25.3 MB",
      "heapUsed": "18.7 MB",
      "external": "2.1 MB",
      "arrayBuffers": "0.5 MB"
    },
    "cpu": {
      "user": 123456,
      "system": 78910,
      "model": "Apple M1 Pro",
      "speed": "3200 MHz"
    },
    "services": {
      "http": {
        "status": "running",
        "port": 3000
      },
      "tcp": {
        "status": "running",
        "port": 3001,
        "totalClients": 2,
        "activeClients": 2
      }
    },
    "storage": {
      "database": "15.6 MB",
      "logs": "8.2 MB",
      "resources": "125.4 MB",
      "total": "149.2 MB"
    },
    "environment": {
      "nodeEnv": "development",
      "timezone": "Asia/Shanghai",
      "locale": "zh-CN"
    },
    "versions": {
      "node": "18.17.0",
      "v8": "10.2.154.26",
      "uv": "1.44.2",
      "zlib": "1.2.13",
      "openssl": "3.0.9",
      "modules": "108",
      "npm": "9.6.7"
    },
    "startTime": "2025-01-01T10:00:00.000Z",
    "currentTime": "2025-01-01T12:30:45.123Z"
  }
}
```

### 获取系统健康状态（仅管理员）
**GET** `/hmos-app/system/health`

**返回：**
```json
{
  "status": 200,
  "message": "操作成功",
  "data": {
    "status": "healthy",
    "timestamp": "2025-01-01T12:30:45.123Z",
    "uptime": 9045,
    "memory": {
      "heapUsed": 19,
      "heapTotal": 25,
      "usage": 76,
      "status": "healthy"
    },
    "services": {
      "http": {
        "status": "running",
        "healthy": true
      },
      "tcp": {
        "status": "running",
        "healthy": true,
        "clients": 2
      },
      "database": {
        "status": "connected",
        "healthy": true
      }
    },
    "load": {
      "average": [1.2, 1.5, 1.8],
      "cpuCount": 8
    }
  }
}
```

### 获取系统性能指标（仅管理员）
**GET** `/hmos-app/system/metrics`

**返回：**
```json
{
  "status": 200,
  "message": "操作成功",
  "data": {
    "timestamp": "2025-01-01T12:30:45.123Z",
    "database": {
      "users": 234,
      "contents": 567,
      "apps": 89,
      "logs": 1234,
      "total": 2124
    },
    "system": {
      "uptime": 9045,
      "memoryUsage": {
        "rss": 47841280,
        "heapTotal": 26542080,
        "heapUsed": 19587456,
        "external": 2198765,
        "arrayBuffers": 524288
      },
      "cpuUsage": {
        "user": 123456,
        "system": 78910
      },
      "platform": "darwin",
      "nodeVersion": "v18.17.0"
    },
    "tcp": {
      "isRunning": true,
      "totalClients": 2,
      "activeClients": [...]
    },
    "performance": {
      "eventLoopDelay": [0, 123456789],
      "gcStats": {...}
    }
  }
}
```
