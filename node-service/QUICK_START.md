# �� HM程序员社区 - 快速启动指南

> 5分钟内快速启动 HM 程序员社区后台服务

## 📋 前置要求

确保你的系统已安装以下软件：

- ✅ **Node.js** >= 18.0.0
- ✅ **MySQL** >= 8.0
- ✅ **npm** >= 8.0.0

> 💡 可以通过 `node -v`、`mysql --version`、`npm -v` 检查版本

## ⚡ 一键启动

### 1. 获取代码

```bash
git clone https://github.com/hm-community/node-service.git
cd node-service
```

### 2. 安装依赖

```bash
npm install
```

### 3. 创建环境配置

创建 `.env` 文件：

```env
# 基础配置
NODE_ENV=development
PORT=3001

# 数据库配置
DB_HOST=localhost
DB_PORT=3306
DB_NAME=hm_community
DB_USER=root
DB_PASSWORD=

# JWT配置（请修改为你的密钥）
JWT_SECRET=hm-community-super-secret-key-2024
JWT_EXPIRES_IN=7d
JWT_REFRESH_EXPIRES_IN=30d

# 其他配置
FRONTEND_URL=http://localhost:3000
ENABLE_STATIC_SITE=true
```

### 4. 准备数据库

登录 MySQL 并创建数据库：

```sql
CREATE DATABASE hm_community CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

### 5. 启动服务

```bash
npm start
```

🎉 **启动成功！** 你将看到类似以下的输出：

```
🎉 HM程序员社区服务启动成功！
📋 运行环境: development
🌐 服务端口: 3001
📚 API文档: http://localhost:3001/api-docs
🧪 API测试: http://localhost:3001/api-test.html
🏠 官网首页: http://localhost:3001
💚 健康检查: http://localhost:3001/health
```

## 🌟 立即体验

### 📱 访问页面

| 页面        | 地址                                | 描述               |
| ----------- | ----------------------------------- | ------------------ |
| 🏠 官网首页 | http://localhost:3001               | 项目介绍和功能展示 |
| 🧪 API测试  | http://localhost:3001/api-test.html | 在线API测试工具    |
| 📚 API文档  | http://localhost:3001/api-docs      | 完整的API接口文档  |
| 💚 健康检查 | http://localhost:3001/health        | 系统状态监控       |

### 🔐 默认账户

系统自动创建的管理员账户：

- **邮箱**: `admin@hm.com`
- **密码**: `123456`

### 🧪 快速测试

1. **打开API测试页面**: http://localhost:3001/api-test.html
2. **登录测试**: 使用默认账户登录
3. **创建内容**: 发布你的第一篇文章
4. **查看内容**: 获取内容列表

## ⚙️ 配置说明

### 环境变量详解

| 变量名        | 必需 | 默认值       | 说明                             |
| ------------- | ---- | ------------ | -------------------------------- |
| `NODE_ENV`    | 否   | development  | 运行环境：development/production |
| `PORT`        | 否   | 3001         | 服务端口号                       |
| `DB_HOST`     | 是   | localhost    | 数据库主机地址                   |
| `DB_PORT`     | 否   | 3306         | 数据库端口                       |
| `DB_NAME`     | 是   | hm_community | 数据库名称                       |
| `DB_USER`     | 是   | root         | 数据库用户名                     |
| `DB_PASSWORD` | 是   |              | 数据库密码                       |
| `JWT_SECRET`  | 是   |              | JWT签名密钥（必须修改）          |

### 系统初始数据

首次启动时，系统会自动创建：

#### 🗂️ 默认分类（8个）

- 前端开发 🎨
- 后端开发 ⚙️
- 移动开发 📱
- 人工智能 🤖
- 数据库 🗄️
- 运维部署 🚀
- 面试求职 💼
- 开发工具 🔧

#### 🏷️ 技术标签（27个）

JavaScript、React、Vue、Angular、Node.js、Python、Java、Go、Rust、PHP、MySQL、MongoDB、Redis、Docker、Kubernetes 等

#### 👤 管理员账户

- 用户名：admin
- 邮箱：admin@hm.com
- 密码：123456（已加密）
- 角色：管理员

## 🛠️ 开发模式

如果你要进行开发，建议使用开发模式：

```bash
# 开发模式（支持热重载）
npm run dev

# 或使用 nodemon
npm install -g nodemon
nodemon app.js
```

## 🐛 常见问题

### Q1: 数据库连接失败

**问题**: `Error: connect ECONNREFUSED 127.0.0.1:3306`

**解决**:

1. 确保 MySQL 服务已启动
2. 检查数据库配置是否正确
3. 确认数据库用户权限

```bash
# 启动 MySQL (macOS)
brew services start mysql

# 启动 MySQL (Ubuntu)
sudo systemctl start mysql

# 启动 MySQL (CentOS)
sudo systemctl start mysqld
```

### Q2: 端口被占用

**问题**: `Error: listen EADDRINUSE: address already in use :::3001`

**解决**:

```bash
# 查找占用端口的进程
lsof -i :3001

# 杀死进程 (替换 PID)
kill -9 <PID>

# 或修改端口
echo "PORT=3002" >> .env
```

### Q3: JWT Secret 错误

**问题**: 用户认证相关错误

**解决**:
确保 `.env` 文件中的 `JWT_SECRET` 不为空且具有足够的复杂度：

```env
JWT_SECRET=your-very-secure-secret-key-here-2024
```

### Q4: 权限问题

**问题**: MySQL 连接权限被拒绝

**解决**:

```sql
-- 创建新用户并授权
CREATE USER 'hm_user'@'localhost' IDENTIFIED BY 'your_password';
GRANT ALL PRIVILEGES ON hm_community.* TO 'hm_user'@'localhost';
FLUSH PRIVILEGES;
```

## 📊 系统监控

### 健康检查

```bash
curl http://localhost:3001/health
```

### 系统日志

```bash
# 查看实时日志
tail -f logs/combined.log

# 查看错误日志
tail -f logs/error.log
```

### 数据库状态

```bash
# 进入 MySQL
mysql -u root -p

# 查看数据库
USE hm_community;
SHOW TABLES;

# 查看用户数量
SELECT COUNT(*) FROM users;
```

## 🚀 生产部署

### Docker 部署

```bash
# 构建镜像
docker build -t hm-community .

# 运行容器
docker run -d \
  --name hm-community \
  -p 3001:3001 \
  -e NODE_ENV=production \
  hm-community
```

### PM2 部署

```bash
# 安装 PM2
npm install -g pm2

# 启动应用
pm2 start app.js --name hm-community

# 查看状态
pm2 status

# 查看日志
pm2 logs hm-community

# 重启应用
pm2 restart hm-community
```

## 📚 更多资源

- 📖 [完整文档](README.md)
- 🌐 [API 接口文档](http://localhost:3001/api-docs)
- 🧪 [在线测试工具](http://localhost:3001/api-test.html)
- 🏠 [项目官网](http://localhost:3001)
- 🐛 [问题反馈](https://github.com/hm-community/node-service/issues)

## 💡 下一步

启动成功后，你可以：

1. **🧪 体验 API** - 访问在线测试工具，测试各种API接口
2. **📚 查看文档** - 浏览完整的API文档了解所有功能
3. **🔨 二次开发** - 基于现有架构开发自己的功能
4. **🌐 部署上线** - 将项目部署到生产环境

## 🔧 高级故障排除

### API响应问题

如果遇到API返回空响应或连接错误：

```bash
# 1. 检查服务状态
curl http://localhost:3001/health

# 2. 重启服务
pkill -f "node.*app.js"
npm start

# 3. 运行测试脚本
node scripts/test-api.js
```

### 数据库同步问题

如果遇到索引错误或表结构问题：

```bash
# 删除数据库重新创建
mysql -u root -p -e "DROP DATABASE IF EXISTS hm_community; CREATE DATABASE hm_community CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"

# 重启服务（会自动重建表结构）
npm start
```

### 服务不稳定

如果服务经常崩溃：

```bash
# 前台运行查看详细错误
node app.js

# 检查系统资源
top
df -h

# 清理日志文件
rm -rf logs/*
```

### 获取详细状态

```bash
# 查看项目状态报告
cat PROJECT_STATUS.md

# 检查端口占用
lsof -i :3001

# 查看进程状态
ps aux | grep node
```

---

<div align="center">

**🎉 恭喜！你已成功启动 HM程序员社区服务**

📊 查看 [PROJECT_STATUS.md](PROJECT_STATUS.md) 了解项目详细状态

如遇问题，请查看上述故障排除方案或提交 Issue

</div>
