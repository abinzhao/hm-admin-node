# 环境变量配置说明

## 📋 配置概览

HM程序员社区后台服务使用环境变量进行配置管理。请在项目根目录创建 `.env` 文件并配置以下变量。

## 🔧 必需配置

### 基础配置

```env
# 运行环境：development, test, production
NODE_ENV=development

# 服务端口
PORT=3001

# 应用URL（用于邮件链接等）
APP_URL=http://localhost:3001
```

### 数据库配置

```env
# MySQL数据库连接信息
DB_HOST=localhost
DB_PORT=3306
DB_NAME=hm_community
DB_USER=root
DB_PASSWORD=your-password
```

### JWT认证配置

```env
# JWT签名密钥（必须修改为复杂密钥）
JWT_SECRET=your-super-secret-jwt-key-change-in-production

# JWT令牌过期时间
JWT_EXPIRES_IN=7d

# 刷新令牌过期时间
JWT_REFRESH_EXPIRES_IN=30d
```

## 📧 邮件服务配置（可选）

```env
# SMTP服务器配置
MAIL_HOST=smtp.gmail.com
MAIL_PORT=587
MAIL_SECURE=false
MAIL_USER=your-email@gmail.com
MAIL_PASS=your-app-password

# 发件人信息
MAIL_FROM_NAME=HM程序员社区
MAIL_FROM_ADDRESS=noreply@hmcommunity.com

# 管理员邮箱（多个用逗号分隔）
ADMIN_EMAILS=admin@hmcommunity.com,support@hmcommunity.com
```

## 🔐 第三方登录配置（可选）

### 微信登录配置

```env
# 微信开放平台配置
WECHAT_APP_ID=wx1234567890abcdef
WECHAT_APP_SECRET=your-wechat-app-secret
WECHAT_REDIRECT_URI=http://localhost:3001/api/auth/oauth/wechat/callback
```

### QQ登录配置

```env
# QQ互联配置
QQ_APP_ID=101234567
QQ_APP_KEY=your-qq-app-key
QQ_REDIRECT_URI=http://localhost:3001/api/auth/oauth/qq/callback
```

### 微博登录配置

```env
# 微博开放平台配置
WEIBO_APP_KEY=1234567890
WEIBO_APP_SECRET=your-weibo-app-secret
WEIBO_REDIRECT_URI=http://localhost:3001/api/auth/oauth/weibo/callback
```

## 📱 短信服务配置（可选）

### 短信服务提供商选择

```env
# 短信服务提供商：aliyun, tencent, mock
SMS_PROVIDER=mock
```

### 阿里云短信配置

```env
# 阿里云AccessKey
ALIYUN_ACCESS_KEY_ID=your-access-key-id
ALIYUN_ACCESS_KEY_SECRET=your-access-key-secret

# 短信签名和模板
ALIYUN_SMS_SIGN_NAME=HM程序员社区
SMS_TEMPLATE_LOGIN=SMS_123456789
SMS_TEMPLATE_REGISTER=SMS_123456790
SMS_TEMPLATE_RESET=SMS_123456791
SMS_TEMPLATE_BIND=SMS_123456792
SMS_TEMPLATE_SECURITY=SMS_123456793
```

### 腾讯云短信配置

```env
# 腾讯云密钥
TENCENT_SECRET_ID=your-secret-id
TENCENT_SECRET_KEY=your-secret-key

# 短信应用配置
TENCENT_SMS_APP_ID=1400123456
TENCENT_SMS_SIGN_NAME=HM程序员社区

# 短信模板ID（腾讯云使用数字ID）
SMS_TEMPLATE_LOGIN=123456
SMS_TEMPLATE_REGISTER=123457
SMS_TEMPLATE_RESET=123458
SMS_TEMPLATE_BIND=123459
SMS_TEMPLATE_SECURITY=123460
```

## 📁 文件上传配置

```env
# 文件上传路径
UPLOAD_PATH=./uploads

# 单文件最大大小（MB）
MAX_FILE_SIZE=10

# 图片最大大小（MB）
MAX_IMAGE_SIZE=5

# 文档最大大小（MB）
MAX_DOCUMENT_SIZE=20
```

## 🛡️ 安全配置

```env
# 限流时间窗口（毫秒）
RATE_LIMIT_WINDOW_MS=900000

# 限流最大请求次数
RATE_LIMIT_MAX_REQUESTS=100

# 加密盐轮数
BCRYPT_SALT_ROUNDS=12

# CORS域名白名单（生产环境，逗号分隔）
CORS_ORIGINS=https://yourdomain.com,https://www.yourdomain.com
```

## 🌐 静态站点配置

```env
# 是否启用静态站点服务
ENABLE_STATIC_SITE=true

# 静态文件路径
STATIC_SITE_PATH=./public
```

## 🔑 OAuth配置（可选）

```env
# GitHub OAuth
GITHUB_CLIENT_ID=your-github-client-id
GITHUB_CLIENT_SECRET=your-github-client-secret

# Google OAuth
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
```

## 📊 日志配置

```env
# 日志级别：error, warn, info, debug
LOG_LEVEL=info

# 日志文件保留天数
LOG_RETENTION_DAYS=30

# 是否启用SQL日志
ENABLE_SQL_LOGGING=false
```

## ⚡ 性能配置

```env
# 请求体大小限制
REQUEST_SIZE_LIMIT=10mb

# 是否启用性能监控
ENABLE_PERFORMANCE_MONITORING=false
```

## 🕐 定时任务配置

```env
# 是否启用定时任务
ENABLE_CRON_JOBS=true

# 数据清理频率（cron表达式）
DATA_CLEANUP_SCHEDULE=0 2 * * *

# 邮件提醒频率
EMAIL_REMINDER_SCHEDULE=0 9 * * *
```

## 🔌 WebSocket配置

```env
# WebSocket路径
WEBSOCKET_PATH=/socket.io

# 是否启用WebSocket
ENABLE_WEBSOCKET=true
```

## 💾 数据备份配置

```env
# 备份存储路径
BACKUP_PATH=./backups

# 自动备份频率
BACKUP_SCHEDULE=0 3 * * *

# 备份保留天数
BACKUP_RETENTION_DAYS=7
```

## 🔗 第三方服务配置（可选）

```env
# Redis缓存
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=0

# 短信服务
SMS_PROVIDER=
SMS_ACCESS_KEY=
SMS_SECRET_KEY=

# 对象存储（如阿里云OSS）
OSS_REGION=
OSS_ACCESS_KEY_ID=
OSS_ACCESS_KEY_SECRET=
OSS_BUCKET=

# CDN配置
CDN_URL=
```

## 🚀 生产环境配置

```env
NODE_ENV=production
PORT=3001

# 数据库配置（必需）
DB_HOST=your-production-db-host
DB_NAME=hm_community_prod
DB_USER=your-db-user
DB_PASSWORD=your-secure-password

# 安全配置
JWT_SECRET=your-very-secure-production-jwt-secret
CORS_ORIGINS=https://yourdomain.com

# SSL配置
SSL_KEY_PATH=/path/to/ssl/key.pem
SSL_CERT_PATH=/path/to/ssl/cert.pem

# 日志配置
LOG_LEVEL=warn
ENABLE_SQL_LOGGING=false
ENABLE_DETAILED_ERRORS=false
```

## 📝 配置模板

创建 `.env` 文件的基础模板：

```env
# 基础配置
NODE_ENV=development
PORT=3001
APP_URL=http://localhost:3001
FRONTEND_URL=http://localhost:3000

# 数据库配置
DB_HOST=localhost
DB_PORT=3306
DB_NAME=hm_community
DB_USER=root
DB_PASSWORD=

# JWT配置
JWT_SECRET=hm-community-secret-key-2024
JWT_EXPIRES_IN=7d
JWT_REFRESH_EXPIRES_IN=30d

# 其他配置
ENABLE_STATIC_SITE=true
ENABLE_CRON_JOBS=true
LOG_LEVEL=info
```

## ⚠️ 安全注意事项

1. **JWT_SECRET**: 生产环境必须使用复杂的密钥
2. **数据库密码**: 使用强密码并定期更换
3. **邮件密码**: 使用应用专用密码，不要使用账户密码
4. **CORS配置**: 生产环境严格限制允许的域名
5. **敏感信息**: 不要将 `.env` 文件提交到版本控制系统

## 🔍 配置验证

启动服务时会自动验证必需配置：

- ✅ 数据库连接
- ✅ JWT密钥配置
- ⚠️ 邮件服务（可选）
- ⚠️ 第三方服务（可选）

## 📚 相关文档

- [快速启动指南](../QUICK_START.md)
- [部署指南](../README.md#部署指南)
- [故障排除](../docs/TROUBLESHOOTING.md)
