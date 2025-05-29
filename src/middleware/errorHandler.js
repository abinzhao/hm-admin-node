const logger = require('../utils/logger');

// 错误处理中间件
function errorHandler(err, req, res, next) {
  logger.error('服务器错误:', err);
  
  // 处理验证错误
  if (err.isJoi) {
    return res.status(400).json({
      code: 400,
      message: '参数验证失败',
      details: err.details
    });
  }

  // 处理数据库错误
  if (err.code === 'ER_DUP_ENTRY') {
    return res.status(400).json({
      code: 400,
      message: '数据已存在'
    });
  }

  // 默认错误处理
  res.status(500).json({
    code: 500,
    message: '服务器内部错误'
  });
}

module.exports = errorHandler;