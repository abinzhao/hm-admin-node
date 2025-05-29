const net = require('net');
const { exec } = require('child_process');
const logger = require('../utils/logger');
const config = require('../config/tcp');

// 存储连接的客户端
const clients = new Map();

// 启动TCP服务器
function startTCPServer() {
  const server = net.createServer((socket) => {
    const clientId = `${socket.remoteAddress}:${socket.remotePort}`;
    logger.info(`客户端 ${clientId} 已连接`);
    
    // 将客户端添加到连接列表
    clients.set(clientId, socket);
    
    // 设置超时
    socket.setTimeout(config.tcp.connectionTimeout);
    
    // 处理接收到的数据
    socket.on('data', (data) => {
      try {
        const message = JSON.parse(data.toString());
        handleMessage(clientId, socket, message);
      } catch (error) {
        logger.error(`解析客户端 ${clientId} 消息失败:`, error);
        socket.write(JSON.stringify({ status: 'error', message: '无效的JSON格式' }));
      }
    });
    
    // 处理超时
    socket.on('timeout', () => {
      logger.info(`客户端 ${clientId} 连接超时`);
      socket.end();
      clients.delete(clientId);
    });
    
    // 处理连接关闭
    socket.on('end', () => {
      logger.info(`客户端 ${clientId} 连接已关闭`);
      clients.delete(clientId);
    });
    
    // 处理错误
    socket.on('error', (error) => {
      logger.error(`客户端 ${clientId} 连接错误:`, error);
      clients.delete(clientId);
    });
  });
  
  // 监听指定端口
  server.listen(config.tcp.port, () => {
    logger.info(`TCP服务器已启动，监听端口 ${config.tcp.port}`);
  });
  
  // 处理服务器错误
  server.on('error', (error) => {
    logger.error('TCP服务器错误:', error);
  });
  
  return server;
}

// 处理客户端消息
async function handleMessage(clientId, socket, message) {
  logger.info(`收到客户端 ${clientId} 消息:`, message);
  
  try {
    switch (message.command) {
      case 'set_debug_info':
        await handleSetDebugInfo(clientId, socket, message);
        break;
      case 'hdc_execute':
        await handleHdcExecute(clientId, socket, message);
        break;
      case 'heartbeat':
        handleHeartbeat(clientId, socket);
        break;
      default:
        socket.write(JSON.stringify({ status: 'error', message: '未知命令' }));
    }
  } catch (error) {
    logger.error(`处理客户端 ${clientId} 消息失败:`, error);
    socket.write(JSON.stringify({ status: 'error', message: error.message }));
  }
}

// 处理设置调试信息
async function handleSetDebugInfo(clientId, socket, message) {
  const { ip, port } = message;
  
  if (!ip || !port) {
    socket.write(JSON.stringify({ status: 'error', message: '缺少IP或端口' }));
    return;
  }
  
  // 保存调试信息
  clients.get(clientId).debugInfo = { ip, port };
  
  // 尝试连接设备
  const result = await testHdcConnection(ip, port);
  
  socket.write(JSON.stringify({
    status: result.success ? 'success' : 'error',
    message: result.message
  }));
}

// 处理HDC命令执行
async function handleHdcExecute(clientId, socket, message) {
  const { args } = message;
  
  if (!args || !Array.isArray(args)) {
    socket.write(JSON.stringify({ status: 'error', message: '无效的命令参数' }));
    return;
  }
  
  const client = clients.get(clientId);
  if (!client || !client.debugInfo) {
    socket.write(JSON.stringify({ status: 'error', message: '未设置调试信息' }));
    return;
  }
  
  const { ip, port } = client.debugInfo;
  
  // 执行HDC命令
  const result = await executeHdcCommand(ip, port, args);
  
  socket.write(JSON.stringify({
    status: result.success ? 'success' : 'error',
    output: result.output
  }));
}

// 处理心跳
function handleHeartbeat(clientId, socket) {
  socket.write(JSON.stringify({ status: 'success', message: '心跳响应' }));
}

// 测试HDC连接
function testHdcConnection(ip, port) {
  return new Promise((resolve) => {
    exec(`${config.hdcPath} target connect ${ip}:${port}`, (error, stdout, stderr) => {
      if (error) {
        logger.error('HDC连接测试失败:', stderr);
        resolve({ success: false, message: `连接失败: ${stderr}` });
        return;
      }
      
      logger.info('HDC连接测试成功:', stdout);
      resolve({ success: true, message: '连接成功' });
    });
  });
}

// 执行HDC命令
function executeHdcCommand(ip, port, args) {
  return new Promise((resolve) => {
    const command = `${config.hdcPath} -t ${ip}:${port} ${args.join(' ')}`;
    
    exec(command, (error, stdout, stderr) => {
      if (error) {
        logger.error('HDC命令执行失败:', stderr);
        resolve({ success: false, output: stderr });
        return;
      }
      
      logger.info('HDC命令执行成功:', stdout);
      resolve({ success: true, output: stdout });
    });
  });
}

module.exports = {
  startTCPServer
};