const app = require('./app');
const logger = require('./utils/logger');
const { initializeDatabase } = require('./config/database');
const initializeTCPServer = require('./tcpServer');

// 端口
const port = process.env.PORT || 3000;

// 检查端口是否被占用
const isPortTaken = (port) => {
  return new Promise((resolve) => {
    const tester = require('net').createServer()
      .once('error', (err) => (err.code === 'EADDRINUSE' ? resolve(true) : resolve(false)))
      .once('listening', () => tester.once('close', () => resolve(false)).close())
      .listen(port);
  });
};

async function startServer() {
  try {
    // 检查端口是否被占用
    const portTaken = await isPortTaken(port);
    if (portTaken) {
      logger.error(`端口 ${port} 已被占用`);
      process.exit(1);
    }

    // 初始化数据库
    await initializeDatabase();
    logger.info('数据库初始化完成');

    // 启动TCP服务器
    const tcpServer = initializeTCPServer();

    // 启动HTTP服务器
    const httpServer = app.listen(port, () => {
      logger.info(`HTTP服务器已启动，监听端口 ${port}`);
    });

    // 处理未捕获的异常
    process.on('uncaughtException', (error) => {
      logger.error('未捕获的异常:', error);
      process.exit(1);
    });

    // 处理未处理的Promise拒绝
    process.on('unhandledRejection', (reason, promise) => {
      logger.error('未处理的Promise拒绝:', reason);
    });

    // 优雅关闭
    const shutdown = (signal) => {
      logger.info(`${signal} 信号接收到，正在优雅关闭...`);
      
      httpServer.close(() => {
        logger.info('HTTP服务器已关闭');
        
        if (tcpServer) {
          tcpServer.close(() => {
            logger.info('TCP服务器已关闭');
            process.exit(0);
          });
        } else {
          process.exit(0);
        }
      });
    };

    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('SIGTERM', () => shutdown('SIGTERM'));

    return { httpServer, tcpServer };
  } catch (error) {
    logger.error('启动服务器失败:', error);
    process.exit(1);
  }
}

// 启动服务器
startServer();