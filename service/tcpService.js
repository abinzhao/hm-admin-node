const net = require('net');
const { exec } = require('child_process');
const logger = require('../utils/logger');

class TCPService {
  constructor() {
    this.server = null;
    this.clients = new Map(); // 存储客户端连接
    this.clientIdCounter = 0;
  }

  // 启动TCP服务器
  start(port = 3001) {
    return new Promise((resolve, reject) => {
      this.server = net.createServer((socket) => {
        this.handleNewConnection(socket);
      });

      this.server.listen(port, () => {
        logger.system(`TCP服务器启动成功，端口: ${port}`);
        resolve();
      });

      this.server.on('error', (err) => {
        logger.error('TCP服务器错误:', { error: err.message });
        reject(err);
      });
    });
  }

  // 处理新连接
  handleNewConnection(socket) {
    const clientId = ++this.clientIdCounter;
    const clientInfo = {
      id: clientId,
      socket: socket,
      remoteAddress: socket.remoteAddress,
      remotePort: socket.remotePort,
      connectTime: new Date(),
      isActive: true
    };

    this.clients.set(clientId, clientInfo);

    logger.tcp(`客户端连接 [ID:${clientId}]`, {
      clientId,
      remoteAddress: socket.remoteAddress,
      remotePort: socket.remotePort,
      totalClients: this.clients.size
    });

    // 发送欢迎消息
    socket.write(`CONNECTED: 欢迎连接到HMOS TCP服务器 [客户端ID: ${clientId}]\n`);

    // 处理客户端数据
    socket.on('data', (data) => {
      this.handleClientData(clientId, data);
    });

    // 处理客户端断开连接
    socket.on('close', () => {
      this.handleClientDisconnect(clientId);
    });

    // 处理连接错误
    socket.on('error', (err) => {
      logger.error(`客户端连接错误 [ID:${clientId}]`, {
        clientId,
        error: err.message
      });
      this.handleClientDisconnect(clientId);
    });

    // 设置超时
    socket.setTimeout(300000); // 5分钟超时
    socket.on('timeout', () => {
      logger.tcp(`客户端连接超时 [ID:${clientId}]`, { clientId });
      socket.end('TIMEOUT: 连接超时，服务器主动断开连接\n');
    });
  }

  // 处理客户端数据
  handleClientData(clientId, data) {
    const client = this.clients.get(clientId);
    if (!client || !client.isActive) {
      return;
    }

    const command = data.toString().trim();
    
    logger.tcp(`收到命令 [ID:${clientId}]`, {
      clientId,
      command: command.substring(0, 100), // 只记录前100个字符
      commandLength: command.length
    });

    // 特殊命令处理
    if (command === 'PING') {
      client.socket.write('PONG\n');
      return;
    }

    if (command === 'DISCONNECT') {
      client.socket.write('BYE: 客户端主动断开连接\n');
      client.socket.end();
      return;
    }

    if (command === 'STATUS') {
      const status = {
        clientId: clientId,
        connectTime: client.connectTime,
        totalClients: this.clients.size
      };
      client.socket.write(`STATUS: ${JSON.stringify(status)}\n`);
      return;
    }

    // 执行adb/hdc命令
    this.executeCommand(clientId, command);
  }

  // 执行命令
  executeCommand(clientId, command) {
    const client = this.clients.get(clientId);
    if (!client || !client.isActive) {
      return;
    }

    const startTime = Date.now();
    
    exec(command, { timeout: 30000 }, (error, stdout, stderr) => {
      const executionTime = Date.now() - startTime;
      
      if (!client.isActive) {
        logger.tcp(`命令执行完成但客户端已断开 [ID:${clientId}]`, {
          clientId,
          command: command.substring(0, 50),
          executionTime
        });
        return;
      }

      if (error) {
        const errorMsg = `ERROR: ${error.message}`;
        client.socket.write(`${errorMsg}\n`);
        
        logger.error(`命令执行失败 [ID:${clientId}]`, {
          clientId,
          command: command.substring(0, 50),
          error: error.message,
          executionTime
        });
        return;
      }

      if (stderr) {
        const stderrMsg = `STDERR: ${stderr}`;
        client.socket.write(`${stderrMsg}\n`);
        
        logger.tcp(`命令执行有警告 [ID:${clientId}]`, {
          clientId,
          command: command.substring(0, 50),
          stderr: stderr.substring(0, 200),
          executionTime
        });
        return;
      }

      const successMsg = `SUCCESS: ${stdout}`;
      client.socket.write(`${successMsg}\n`);
      
      logger.tcp(`命令执行成功 [ID:${clientId}]`, {
        clientId,
        command: command.substring(0, 50),
        outputLength: stdout.length,
        executionTime
      });
    });
  }

  // 处理客户端断开连接
  handleClientDisconnect(clientId) {
    const client = this.clients.get(clientId);
    if (client) {
      client.isActive = false;
      this.clients.delete(clientId);
      
      const connectionDuration = Date.now() - client.connectTime.getTime();
      
      logger.tcp(`客户端断开连接 [ID:${clientId}]`, {
        clientId,
        connectionDuration: Math.round(connectionDuration / 1000) + 's',
        remainingClients: this.clients.size
      });
    }
  }

  // 获取连接状态
  getStatus() {
    const activeClients = Array.from(this.clients.values()).map(client => ({
      id: client.id,
      remoteAddress: client.remoteAddress,
      remotePort: client.remotePort,
      connectTime: client.connectTime,
      connectionDuration: Math.round((Date.now() - client.connectTime.getTime()) / 1000)
    }));

    return {
      isRunning: this.server && this.server.listening,
      totalClients: this.clients.size,
      activeClients
    };
  }

  // 广播消息给所有客户端
  broadcast(message) {
    let sentCount = 0;
    this.clients.forEach((client) => {
      if (client.isActive) {
        try {
          client.socket.write(`BROADCAST: ${message}\n`);
          sentCount++;
        } catch (err) {
          logger.error(`广播消息失败 [ID:${client.id}]`, {
            clientId: client.id,
            error: err.message
          });
        }
      }
    });

    logger.tcp(`广播消息`, {
      message: message.substring(0, 100),
      sentCount,
      totalClients: this.clients.size
    });

    return sentCount;
  }

  // 关闭服务器
  close() {
    return new Promise((resolve) => {
      if (this.server) {
        // 通知所有客户端服务器即将关闭
        this.broadcast('服务器即将关闭，请保存工作并断开连接');
        
        // 等待2秒后强制关闭所有连接
        setTimeout(() => {
          this.clients.forEach((client) => {
            if (client.isActive) {
              client.socket.end();
            }
          });
          
          this.server.close(() => {
            logger.system('TCP服务器已关闭');
            resolve();
          });
        }, 2000);
      } else {
        resolve();
      }
    });
  }
}

module.exports = new TCPService();
