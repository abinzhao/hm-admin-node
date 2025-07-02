# 故障排除指南

## 🚨 常见问题解决方案

### 1. 数据库连接问题

#### 问题：`Error: connect ECONNREFUSED 127.0.0.1:3306`

**原因**：MySQL服务未启动或连接配置错误

**解决方案**：

```bash
# 检查MySQL服务状态
# macOS
brew services list | grep mysql
brew services start mysql

# Ubuntu/Debian
sudo systemctl status mysql
sudo systemctl start mysql

# CentOS/RHEL
sudo systemctl status mysqld
sudo systemctl start mysqld

# Windows
net start mysql
```

#### 问题：`Access denied for user 'root'@'localhost'`

**原因**：数据库用户权限问题

**解决方案**：

```sql
-- 重置root密码
ALTER USER 'root'@'localhost' IDENTIFIED BY 'new_password';
FLUSH PRIVILEGES;

-- 或创建新用户
CREATE USER 'hm_user'@'localhost' IDENTIFIED BY 'secure_password';
GRANT ALL PRIVILEGES ON hm_community.* TO 'hm_user'@'localhost';
FLUSH PRIVILEGES;
```

#### 问题：`Database 'hm_community' doesn't exist`

**解决方案**：

```sql
CREATE DATABASE hm_community CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

### 2. 端口占用问题

#### 问题：`Error: listen EADDRINUSE: address already in use :::3001`

**解决方案**：

```bash
# 查找占用端口的进程
lsof -i :3001

# 杀死进程
kill -9 <PID>

# 或更改端口
echo "PORT=3002" >> .env
```

### 3. JWT认证问题

#### 问题：Token验证失败

**原因**：JWT_SECRET配置错误或未配置

**解决方案**：

```env
# 在.env文件中配置
JWT_SECRET=your-secure-secret-key-here
```

#### 问题：Token过期

**解决方案**：

```bash
# 重新登录获取新token
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@hm.com","password":"123456"}'
```

### 4. 文件上传问题

#### 问题：上传文件失败

**检查事项**：

1. 确保uploads目录存在且有写权限
2. 检查文件大小限制
3. 验证文件类型

**解决方案**：

```bash
# 创建上传目录
mkdir -p uploads
chmod 755 uploads

# 检查磁盘空间
df -h

# 检查目录权限
ls -la uploads/
```

### 5. 邮件服务问题

#### 问题：邮件发送失败

**解决方案**：

```env
# 配置SMTP设置
MAIL_HOST=smtp.gmail.com
MAIL_PORT=587
MAIL_SECURE=false
MAIL_USER=your-email@gmail.com
MAIL_PASS=your-app-password
```

**Gmail配置**：

1. 启用两步验证
2. 生成应用专用密码
3. 使用应用密码而非账户密码

### 6. API响应问题

#### 问题：API返回500错误

**调试步骤**：

```bash
# 查看详细错误日志
tail -f logs/error.log

# 检查服务状态
curl http://localhost:3001/health

# 重启服务
npm run dev
```

#### 问题：CORS错误

**解决方案**：

```env
# 配置允许的域名
FRONTEND_URL=http://localhost:3000
CORS_ORIGINS=http://localhost:3000,http://localhost:8080
```

### 7. 性能问题

#### 问题：API响应慢

**优化方案**：

1. 检查数据库查询性能
2. 添加数据库索引
3. 优化查询逻辑

```sql
-- 检查慢查询
SHOW VARIABLES LIKE 'slow_query_log';
SET GLOBAL slow_query_log = 'ON';

-- 添加索引
CREATE INDEX idx_user_email ON users(email);
CREATE INDEX idx_content_created ON contents(created_at);
```

#### 问题：内存占用高

**解决方案**：

```bash
# 监控内存使用
node --max-old-space-size=2048 app.js

# 查看内存使用
curl http://localhost:3001/api/status
```

### 8. WebSocket连接问题

#### 问题：实时功能不工作

**检查事项**：

1. WebSocket连接状态
2. 防火墙设置
3. 代理配置

**解决方案**：

```javascript
// 客户端测试WebSocket连接
const socket = io("http://localhost:3001");
socket.on("connect", () => {
  console.log("WebSocket连接成功");
});
```

### 9. 静态文件问题

#### 问题：静态文件访问404

**解决方案**：

```env
# 启用静态站点服务
ENABLE_STATIC_SITE=true
STATIC_SITE_PATH=./public
```

```bash
# 检查文件权限
ls -la public/
chmod -R 644 public/*.html
```

### 10. 定时任务问题

#### 问题：定时任务不执行

**解决方案**：

```env
# 启用定时任务
ENABLE_CRON_JOBS=true
```

```bash
# 查看定时任务日志
grep "cron" logs/combined.log
```

## 🔧 调试工具

### 1. 日志分析

```bash
# 实时查看所有日志
tail -f logs/combined.log

# 查看错误日志
tail -f logs/error.log

# 搜索特定错误
grep "ERROR" logs/combined.log

# 按日期过滤
grep "2024-01-01" logs/combined.log
```

### 2. 数据库调试

```sql
-- 查看表结构
DESCRIBE users;
SHOW CREATE TABLE users;

-- 查看连接数
SHOW PROCESSLIST;

-- 查看表大小
SELECT
  table_name,
  ROUND(((data_length + index_length) / 1024 / 1024), 2) AS `Size (MB)`
FROM information_schema.TABLES
WHERE table_schema = 'hm_community';
```

### 3. API测试

```bash
# 健康检查
curl http://localhost:3001/health

# 登录测试
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@hm.com","password":"123456"}'

# 带认证的API测试
curl -X GET http://localhost:3001/api/todos \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 4. 性能监控

```bash
# 系统资源监控
top
htop
free -h
df -h

# Node.js进程监控
ps aux | grep node
lsof -p <node_pid>
```

## 🚨 紧急处理

### 服务崩溃恢复

```bash
# 快速重启
pkill -f "node.*app.js"
npm start

# 或使用PM2
pm2 restart hm-community
```

### 数据库恢复

```bash
# 备份当前数据
mysqldump -u root -p hm_community > backup_$(date +%Y%m%d_%H%M%S).sql

# 恢复数据
mysql -u root -p hm_community < backup.sql
```

### 日志清理

```bash
# 清理旧日志（保留最近7天）
find logs/ -name "*.log" -mtime +7 -delete

# 清理上传文件
find uploads/ -type f -mtime +30 -delete
```

## 📊 监控建议

### 1. 关键指标监控

- API响应时间
- 数据库连接数
- 内存使用率
- 磁盘空间
- 错误率

### 2. 告警设置

```bash
# 设置磁盘空间告警
df -h | awk '$5 > 80 { print $0 }'

# 设置内存使用告警
free | awk 'NR==2{printf "Memory Usage: %s/%s (%.2f%%)\n", $3,$2,$3*100/$2 }'
```

### 3. 自动化脚本

```bash
#!/bin/bash
# health_check.sh - 健康检查脚本

# 检查服务状态
if ! curl -f http://localhost:3001/health > /dev/null 2>&1; then
    echo "Service is down, restarting..."
    npm start
fi

# 检查数据库连接
if ! mysqladmin ping -h localhost -u root -p > /dev/null 2>&1; then
    echo "Database is down"
    # 发送告警邮件
fi
```

## 🆘 支持渠道

### 技术支持

- **GitHub Issues**: [项目Issue页面](https://github.com/hm-community/node-service/issues)
- **邮件支持**: support@hmcommunity.com
- **文档中心**: [完整文档](../README.md)

### 社区支持

- **官方论坛**: https://forum.hm-community.com
- **QQ群**: 123456789
- **微信群**: 扫描二维码加入

---

**💡 提示**: 遇到问题时，请先查看日志文件，大部分问题都能从日志中找到解决线索。
