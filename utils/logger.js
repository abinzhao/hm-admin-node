const winston = require('winston');
const DailyRotateFile = require('winston-daily-rotate-file');
const path = require('path');
const fs = require('fs-extra');
const { db } = require('../config/database');

// 确保日志目录存在
const logDir = path.join(__dirname, '../logs');
fs.ensureDirSync(logDir);

// 自定义日志格式
const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

// 控制台格式
const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({ format: 'HH:mm:ss' }),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    let log = `[${timestamp}] ${level}: ${message}`;
    if (Object.keys(meta).length > 0) {
      log += ` ${JSON.stringify(meta)}`;
    }
    return log;
  })
);

// 创建winston logger
const logger = winston.createLogger({
  level: 'info',
  format: logFormat,
  transports: [
    // 控制台输出
    new winston.transports.Console({
      format: consoleFormat,
      level: 'debug'
    }),
    
    // 错误日志文件
    new DailyRotateFile({
      filename: path.join(logDir, 'error-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      level: 'error',
      maxSize: '20m',
      maxFiles: '14d'
    }),
    
    // 所有日志文件
    new DailyRotateFile({
      filename: path.join(logDir, 'combined-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      maxSize: '20m',
      maxFiles: '30d'
    })
  ]
});

// 将日志保存到数据库
function saveLogToDatabase(level, message, meta = {}) {
  const logData = {
    level,
    message,
    meta: JSON.stringify(meta),
    timestamp: new Date().toISOString(),
    source: meta.source || 'system'
  };
  
  db.run(
    'INSERT INTO logs (level, message, meta, timestamp, source) VALUES (?, ?, ?, ?, ?)',
    [logData.level, logData.message, logData.meta, logData.timestamp, logData.source],
    (err) => {
      if (err) {
        console.error('保存日志到数据库失败:', err);
      }
    }
  );
}

// 扩展logger方法，同时保存到数据库
const originalLog = logger.log;
logger.log = function(level, message, meta = {}) {
  // 调用原始log方法
  originalLog.call(this, level, message, meta);
  
  // 保存到数据库
  if (typeof level === 'object') {
    // 如果第一个参数是对象，重新组织参数
    const logObj = level;
    saveLogToDatabase(logObj.level || 'info', logObj.message, logObj);
  } else {
    saveLogToDatabase(level, message, meta);
  }
};

// 便捷方法
logger.tcp = (message, meta = {}) => {
  logger.info(message, { ...meta, source: 'tcp' });
};

logger.api = (message, meta = {}) => {
  logger.info(message, { ...meta, source: 'api' });
};

logger.db = (message, meta = {}) => {
  logger.info(message, { ...meta, source: 'database' });
};

logger.system = (message, meta = {}) => {
  logger.info(message, { ...meta, source: 'system' });
};

module.exports = logger;
