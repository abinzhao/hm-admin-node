module.exports = {
  // TCP服务器配置
  tcp: {
    port: process.env.TCP_PORT || 8888,
    // 连接超时时间（毫秒）
    connectionTimeout: 60000,
    // 心跳间隔时间（毫秒）
    heartbeatInterval: 30000
  },
  // HDC工具路径
  hdcPath: process.env.HDC_PATH || 'hdc'
};