const logger = require("../utils/logger");
const { User } = require("../models");
const jwt = require("jsonwebtoken");

class SocketService {
  constructor() {
    this.io = null;
    this.connectedDevices = new Map(); // 存储连接的设备
    this.maxConnections = parseInt(process.env.TCP_MAX_CONNECTIONS) || 500;
    this.connectionTimeout = parseInt(process.env.TCP_TIMEOUT) || 300000; // 5分钟
  }

  // 初始化Socket.IO服务
  initialize(io) {
    this.io = io;

    // 设置认证中间件
    io.use(async (socket, next) => {
      try {
        const token = socket.handshake.auth.token || socket.handshake.headers.authorization;

        if (!token) {
          return next(new Error("认证失败：缺少token"));
        }

        // 验证JWT token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findByPk(decoded.userId, {
          attributes: { exclude: ["password"] },
        });

        if (!user || user.status !== "active") {
          return next(new Error("认证失败：用户无效"));
        }

        socket.user = user;
        next();
      } catch (error) {
        next(new Error("认证失败：无效token"));
      }
    });

    // 处理连接
    io.on("connection", (socket) => {
      this.handleConnection(socket);
    });

    // TCP服务命名空间
    const tcpNamespace = io.of("/socket/tcp");
    tcpNamespace.use(this.tcpAuthMiddleware.bind(this));
    tcpNamespace.on("connection", (socket) => {
      this.handleTcpConnection(socket);
    });

    logger.info("Socket.IO服务已初始化");
  }

  // 处理普通Socket连接
  handleConnection(socket) {
    const userId = socket.user.id;
    logger.info(`用户连接: ${userId} (${socket.id})`);

    // 用户加入个人房间
    socket.join(`user:${userId}`);

    // 处理用户状态更新
    socket.on("status_update", (data) => {
      this.handleStatusUpdate(socket, data);
    });

    // 处理私信
    socket.on("private_message", (data) => {
      this.handlePrivateMessage(socket, data);
    });

    // 处理聊天消息
    socket.on("chat_message", (data) => {
      this.handleChatMessage(socket, data);
    });

    // 处理加入聊天房间
    socket.on("join_chat", (chatId) => {
      socket.join(`chat:${chatId}`);
      logger.debug(`用户 ${userId} 加入聊天房间: ${chatId}`);
    });

    // 处理离开聊天房间
    socket.on("leave_chat", (chatId) => {
      socket.leave(`chat:${chatId}`);
      logger.debug(`用户 ${userId} 离开聊天房间: ${chatId}`);
    });

    // 处理输入状态
    socket.on("typing", (data) => {
      this.handleTyping(socket, data);
    });

    // 处理停止输入
    socket.on("stop_typing", (data) => {
      this.handleStopTyping(socket, data);
    });

    // 处理消息已读回执
    socket.on("message_read", (data) => {
      this.handleMessageRead(socket, data);
    });

    // 处理加入房间（通用）
    socket.on("join_room", (roomId) => {
      socket.join(roomId);
      logger.debug(`用户 ${userId} 加入房间: ${roomId}`);
    });

    // 处理离开房间（通用）
    socket.on("leave_room", (roomId) => {
      socket.leave(roomId);
      logger.debug(`用户 ${userId} 离开房间: ${roomId}`);
    });

    // 处理断开连接
    socket.on("disconnect", (reason) => {
      logger.info(`用户断开连接: ${userId} (${reason})`);
    });
  }

  // TCP认证中间件
  async tcpAuthMiddleware(socket, next) {
    try {
      // TCP连接不需要用户认证，但需要检查连接数
      if (this.connectedDevices.size >= this.maxConnections) {
        return next(new Error("连接数已达上限"));
      }

      next();
    } catch (error) {
      next(error);
    }
  }

  // 处理TCP设备连接
  handleTcpConnection(socket) {
    const deviceId = socket.id;
    logger.info(`TCP设备连接: ${deviceId}`);

    // 记录设备连接
    const deviceInfo = {
      id: deviceId,
      socket: socket,
      connectedAt: new Date(),
      lastActivity: new Date(),
      info: null,
      status: "connected",
    };

    this.connectedDevices.set(deviceId, deviceInfo);

    // 设置连接超时
    const timeout = setTimeout(() => {
      this.disconnectDevice(deviceId, "timeout");
    }, this.connectionTimeout);

    socket.timeout = timeout;

    // 设备信息注册
    socket.on("device_info", (data) => {
      this.handleDeviceInfo(socket, data);
    });

    // 处理命令响应
    socket.on("command_response", (data) => {
      this.handleCommandResponse(socket, data);
    });

    // 处理文件传输
    socket.on("file_transfer", (data) => {
      this.handleFileTransfer(socket, data);
    });

    // 处理心跳
    socket.on("heartbeat", () => {
      this.updateDeviceActivity(deviceId);
    });

    // 处理断开连接
    socket.on("disconnect", (reason) => {
      this.handleTcpDisconnect(deviceId, reason);
    });

    // 发送欢迎消息
    socket.emit("connected", {
      deviceId: deviceId,
      serverTime: new Date().toISOString(),
      maxIdleTime: this.connectionTimeout,
    });
  }

  // 处理设备信息
  handleDeviceInfo(socket, data) {
    const deviceId = socket.id;
    const device = this.connectedDevices.get(deviceId);

    if (device) {
      device.info = {
        platform: data.platform,
        version: data.version,
        model: data.model,
        capabilities: data.capabilities || [],
      };

      device.lastActivity = new Date();
      this.connectedDevices.set(deviceId, device);

      logger.info(`设备信息已更新: ${deviceId}`, data);

      socket.emit("device_registered", {
        success: true,
        message: "设备注册成功",
      });
    }
  }

  // 处理命令响应
  handleCommandResponse(socket, data) {
    const deviceId = socket.id;
    this.updateDeviceActivity(deviceId);

    logger.info(`收到设备命令响应: ${deviceId}`, data);

    // 将响应转发给发送命令的客户端
    if (data.requestId) {
      this.io.emit(`command_response_${data.requestId}`, data);
    }
  }

  // 处理文件传输
  handleFileTransfer(socket, data) {
    const deviceId = socket.id;
    this.updateDeviceActivity(deviceId);

    logger.info(`文件传输事件: ${deviceId}`, {
      type: data.type,
      fileName: data.fileName,
      progress: data.progress,
    });

    // 转发文件传输进度
    if (data.requestId) {
      this.io.emit(`file_transfer_${data.requestId}`, data);
    }
  }

  // 更新设备活动时间
  updateDeviceActivity(deviceId) {
    const device = this.connectedDevices.get(deviceId);
    if (device) {
      device.lastActivity = new Date();
      this.connectedDevices.set(deviceId, device);
    }
  }

  // 处理TCP设备断开连接
  handleTcpDisconnect(deviceId, reason) {
    logger.info(`TCP设备断开连接: ${deviceId} (${reason})`);

    const device = this.connectedDevices.get(deviceId);
    if (device) {
      // 清理超时器
      if (device.socket.timeout) {
        clearTimeout(device.socket.timeout);
      }

      this.connectedDevices.delete(deviceId);
    }
  }

  // 断开设备连接
  disconnectDevice(deviceId, reason = "manual") {
    const device = this.connectedDevices.get(deviceId);
    if (device) {
      device.socket.emit("disconnect_notice", {
        reason: reason,
        message: reason === "timeout" ? "连接超时" : "服务器主动断开",
      });

      device.socket.disconnect(true);
      this.connectedDevices.delete(deviceId);

      logger.info(`设备连接已断开: ${deviceId} (${reason})`);
    }
  }

  // 向设备发送命令
  async sendCommandToDevice(deviceId, command) {
    const device = this.connectedDevices.get(deviceId);

    if (!device) {
      throw new Error("设备未连接");
    }

    const requestId = this.generateRequestId();
    const commandData = {
      requestId,
      type: "command",
      action: command.action,
      params: command.params || {},
      timestamp: new Date().toISOString(),
    };

    return new Promise((resolve, reject) => {
      // 设置响应超时
      const timeout = setTimeout(() => {
        reject(new Error("命令执行超时"));
      }, 30000); // 30秒超时

      // 监听响应
      const responseHandler = (response) => {
        clearTimeout(timeout);
        this.io.off(`command_response_${requestId}`, responseHandler);

        if (response.success) {
          resolve(response);
        } else {
          reject(new Error(response.error || "命令执行失败"));
        }
      };

      this.io.on(`command_response_${requestId}`, responseHandler);

      // 发送命令
      device.socket.emit("command", commandData);
      this.updateDeviceActivity(deviceId);
    });
  }

  // 获取在线设备列表
  getOnlineDevices() {
    const devices = [];

    for (const [id, device] of this.connectedDevices) {
      devices.push({
        id: id,
        info: device.info,
        connectedAt: device.connectedAt,
        lastActivity: device.lastActivity,
        status: device.status,
      });
    }

    return devices;
  }

  // 处理状态更新
  handleStatusUpdate(socket, data) {
    const userId = socket.user.id;

    // 广播用户状态到相关房间
    socket.broadcast.to(`user:${userId}`).emit("user_status_update", {
      userId: userId,
      status: data.status,
      timestamp: new Date().toISOString(),
    });
  }

  // 处理私信
  handlePrivateMessage(socket, data) {
    const senderId = socket.user.id;
    const { receiverId, content, type = "text" } = data;

    // 发送消息给接收者
    this.io.to(`user:${receiverId}`).emit("private_message", {
      senderId: senderId,
      content: content,
      type: type,
      timestamp: new Date().toISOString(),
    });

    // 确认消息已发送
    socket.emit("message_sent", {
      receiverId: receiverId,
      timestamp: new Date().toISOString(),
    });
  }

  // 处理聊天消息
  handleChatMessage(socket, data) {
    const senderId = socket.user.id;
    const { chatId, content, type = "text", replyToId, mentions } = data;

    // 广播消息到聊天房间
    socket.to(`chat:${chatId}`).emit("chat_message", {
      senderId,
      chatId,
      content,
      type,
      replyToId,
      mentions,
      timestamp: new Date().toISOString(),
    });

    // 确认消息已发送
    socket.emit("message_sent", {
      chatId,
      timestamp: new Date().toISOString(),
    });
  }

  // 处理输入状态
  handleTyping(socket, data) {
    const userId = socket.user.id;
    const { chatId } = data;

    // 广播输入状态到聊天房间（除了发送者）
    socket.to(`chat:${chatId}`).emit("user_typing", {
      userId,
      chatId,
      timestamp: new Date().toISOString(),
    });
  }

  // 处理停止输入
  handleStopTyping(socket, data) {
    const userId = socket.user.id;
    const { chatId } = data;

    // 广播停止输入状态到聊天房间
    socket.to(`chat:${chatId}`).emit("user_stop_typing", {
      userId,
      chatId,
      timestamp: new Date().toISOString(),
    });
  }

  // 处理消息已读回执
  handleMessageRead(socket, data) {
    const userId = socket.user.id;
    const { chatId, messageId } = data;

    // 广播已读状态到聊天房间
    socket.to(`chat:${chatId}`).emit("message_read", {
      userId,
      chatId,
      messageId,
      timestamp: new Date().toISOString(),
    });
  }

  // 发送通知给用户
  sendNotificationToUser(userId, notification) {
    this.io.to(`user:${userId}`).emit("notification", notification);
  }

  // 广播消息到房间
  broadcastToRoom(roomId, event, data) {
    this.io.to(roomId).emit(event, data);
  }

  // 生成请求ID
  generateRequestId() {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // 获取连接统计
  getConnectionStats() {
    const now = new Date();
    const activeDevices = Array.from(this.connectedDevices.values()).filter(
      (device) => now - device.lastActivity < 60000 // 1分钟内有活动
    );

    return {
      totalConnections: this.connectedDevices.size,
      activeConnections: activeDevices.length,
      maxConnections: this.maxConnections,
      utilizationRate: ((this.connectedDevices.size / this.maxConnections) * 100).toFixed(2) + "%",
    };
  }
}

// 创建单例实例
const socketService = new SocketService();

module.exports = socketService;
