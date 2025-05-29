const logger = require('./utils/logger');
const { startTCPServer } = require('./services/tcpService');

// 启动TCP服务器
function initializeTCPServer() {
  try {
    const tcpServer = startTCPServer();
    return tcpServer;
  } catch (error) {
    logger.error('启动TCP服务器失败:', error);
    process.exit(1);
  }
}

module.exports = initializeTCPServer;