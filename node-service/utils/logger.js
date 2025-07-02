const fs = require('fs');
const path = require('path');

// 确保日志目录存在
const logDir = path.join(__dirname, '..', 'logs');
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

// 日志级别
const LOG_LEVELS = {
  error: 0,
  warn: 1,
  info: 2,
  debug: 3
};

// 当前日志级别
const currentLevel = LOG_LEVELS[process.env.LOG_LEVEL] || LOG_LEVELS.info;

// 格式化时间
function formatTime() {
  return new Date().toISOString().replace('T', ' ').substring(0, 19);
}

// 格式化日志消息
function formatMessage(level, message, meta = {}) {
  const timestamp = formatTime();
  const metaStr = Object.keys(meta).length > 0 ? ` ${JSON.stringify(meta)}` : '';
  return `[${timestamp}] [${level.toUpperCase()}] ${message}${metaStr}`;
}

// 写入日志文件
function writeToFile(level, message, meta = {}) {
  const logFile = path.join(logDir, `${new Date().toISOString().split('T')[0]}.log`);
  const logMessage = formatMessage(level, message, meta) + '\n';
  
  fs.appendFile(logFile, logMessage, (err) => {
    if (err) {
      console.error('写入日志文件失败:', err);
    }
  });
}

// 控制台输出
function logToConsole(level, message, meta = {}) {
  const formattedMessage = formatMessage(level, message, meta);
  
  switch (level) {
    case 'error':
      console.error('\x1b[31m%s\x1b[0m', formattedMessage); // 红色
      break;
    case 'warn':
      console.warn('\x1b[33m%s\x1b[0m', formattedMessage); // 黄色
      break;
    case 'info':
      console.info('\x1b[36m%s\x1b[0m', formattedMessage); // 青色
      break;
    case 'debug':
      console.debug('\x1b[90m%s\x1b[0m', formattedMessage); // 灰色
      break;
    default:
      console.log(formattedMessage);
  }
}

// 日志记录函数
function log(level, message, meta = {}) {
  if (LOG_LEVELS[level] > currentLevel) {
    return;
  }

  // 控制台输出
  logToConsole(level, message, meta);
  
  // 文件输出（生产环境或配置了日志文件时）
  if (process.env.NODE_ENV === 'production' || process.env.LOG_FILE) {
    writeToFile(level, message, meta);
  }
}

// 清理旧日志文件（保留30天）
function cleanOldLogs() {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  
  fs.readdir(logDir, (err, files) => {
    if (err) return;
    
    files.forEach(file => {
      const filePath = path.join(logDir, file);
      const match = file.match(/^(\d{4}-\d{2}-\d{2})\.log$/);
      
      if (match) {
        const fileDate = new Date(match[1]);
        if (fileDate < thirtyDaysAgo) {
          fs.unlink(filePath, (unlinkErr) => {
            if (unlinkErr) {
              console.error('删除旧日志文件失败:', unlinkErr);
            } else {
              console.log('已删除旧日志文件:', file);
            }
          });
        }
      }
    });
  });
}

// 每天执行一次清理
setInterval(cleanOldLogs, 24 * 60 * 60 * 1000);

// 导出日志对象
const logger = {
  error: (message, meta) => log('error', message, meta),
  warn: (message, meta) => log('warn', message, meta),
  info: (message, meta) => log('info', message, meta),
  debug: (message, meta) => log('debug', message, meta),
  
  // HTTP请求日志
  request: (req, res, responseTime) => {
    const meta = {
      method: req.method,
      url: req.originalUrl,
      ip: req.ip || req.connection.remoteAddress,
      userAgent: req.get('User-Agent'),
      statusCode: res.statusCode,
      responseTime: `${responseTime}ms`
    };
    
    if (res.statusCode >= 400) {
      log('error', `HTTP ${res.statusCode} ${req.method} ${req.originalUrl}`, meta);
    } else {
      log('info', `HTTP ${res.statusCode} ${req.method} ${req.originalUrl}`, meta);
    }
  },
  
  // 数据库查询日志
  query: (sql, duration, params) => {
    if (process.env.NODE_ENV === 'development') {
      log('debug', 'Database Query', {
        sql: sql.replace(/\s+/g, ' ').trim(),
        duration: `${duration}ms`,
        params
      });
    }
  },
  
  // 用户操作日志
  userAction: (userId, action, target, data = {}) => {
    log('info', `User Action: ${action}`, {
      userId,
      action,
      target,
      data
    });
  },
  
  // 系统事件日志
  system: (event, data = {}) => {
    log('info', `System Event: ${event}`, data);
  },
  
  // 安全事件日志
  security: (event, data = {}) => {
    log('warn', `Security Event: ${event}`, data);
  }
};

module.exports = logger; 