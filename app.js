const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
const fs = require('fs-extra');

const { initDatabase } = require('./config/database');
const { checkAndKillPort } = require('./utils/portUtils');
const logger = require('./utils/logger');
const tcpService = require('./service/tcpService');

// 路由导入
const userRoutes = require('./routes/userRoutes');
const contentRoutes = require('./routes/contentRoutes');
const appRoutes = require('./routes/appRoutes');
const messageRoutes = require('./routes/messageRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const todoRoutes = require('./routes/todoRoutes');
const categoryRoutes = require('./routes/categoryRoutes');
const logRoutes = require('./routes/logRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');
const systemRoutes = require('./routes/systemRoutes');

const app = express();
const PORT = 3000;

// 中间件配置
app.use(cors());
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '50mb' }));

// 请求日志中间件
app.use((req, res, next) => {
  const startTime = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    logger.api(`${req.method} ${req.originalUrl}`, {
      method: req.method,
      url: req.originalUrl,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      userAgent: req.get('User-Agent'),
      ip: req.ip || req.connection.remoteAddress
    });
  });
  
  next();
});

// 静态资源服务
app.use('/resources', express.static(path.join(__dirname, 'resources')));

// 确保资源目录存在
fs.ensureDirSync(path.join(__dirname, 'resources/uploads'));
fs.ensureDirSync(path.join(__dirname, 'resources/apps'));

// 路由配置
app.use('/hmos-app/user', userRoutes);
app.use('/hmos-app/content', contentRoutes);
app.use('/hmos-app/app', appRoutes);
app.use('/hmos-app/message', messageRoutes);
app.use('/hmos-app/notification', notificationRoutes);
app.use('/hmos-app/todo', todoRoutes);
app.use('/hmos-app/category', categoryRoutes);
app.use('/hmos-app/log', logRoutes);
app.use('/hmos-app/dashboard', dashboardRoutes);
app.use('/hmos-app/system', systemRoutes);

// 健康检查接口
app.get('/hmos-app/health', (req, res) => {
  const tcpStatus = tcpService.getStatus();
  res.json({ 
    status: 200, 
    message: 'Server is running', 
    timestamp: new Date().toISOString(),
    tcpService: {
      isRunning: tcpStatus.isRunning,
      totalClients: tcpStatus.totalClients
    }
  });
});

// 全局错误处理
app.use((err, req, res, next) => {
  logger.error('未处理的错误', {
    error: err.message,
    stack: err.stack,
    url: req.originalUrl,
    method: req.method
  });
  
  res.status(500).json({
    status: 500,
    message: '服务器内部错误',
    data: null
  });
});

// 404处理
app.use((req, res) => {
  logger.api(`404 - ${req.method} ${req.originalUrl}`, {
    method: req.method,
    url: req.originalUrl,
    statusCode: 404
  });
  
  res.status(404).json({
    status: 404,
    message: '接口不存在',
    data: null
  });
});

// 启动服务器
async function startServer() {
  try {
    logger.system('开始启动HMOS后台服务器...');
    
    // 检查并杀掉占用端口的进程
    await checkAndKillPort(PORT);
    
    // 初始化数据库
    await initDatabase();
    logger.db('数据库初始化完成');
    
    // 启动HTTP服务器
    app.listen(PORT, () => {
      logger.system(`HTTP服务器启动成功`, {
        port: PORT,
        url: `http://localhost:${PORT}`
      });
    });
    
    // 启动TCP服务器
    await tcpService.start(3001);
    
    logger.system('HMOS后台服务器启动完成', {
      httpPort: PORT,
      tcpPort: 3001,
      environment: process.env.NODE_ENV || 'development'
    });
    
  } catch (error) {
    logger.error('服务器启动失败', {
      error: error.message,
      stack: error.stack
    });
    process.exit(1);
  }
}

// 优雅关闭
process.on('SIGINT', async () => {
  logger.system('收到SIGINT信号，开始优雅关闭服务器...');
  
  try {
    await tcpService.close();
    logger.system('服务器已优雅关闭');
    process.exit(0);
  } catch (error) {
    logger.error('关闭服务器时出错', { error: error.message });
    process.exit(1);
  }
});

process.on('SIGTERM', async () => {
  logger.system('收到SIGTERM信号，开始优雅关闭服务器...');
  
  try {
    await tcpService.close();
    logger.system('服务器已优雅关闭');
    process.exit(0);
  } catch (error) {
    logger.error('关闭服务器时出错', { error: error.message });
    process.exit(1);
  }
});

startServer();

module.exports = app;
