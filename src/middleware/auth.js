const { verifyToken } = require('../config/jwt');
const logger = require('../utils/logger');

// 验证JWT令牌
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ code: 401, message: '未提供令牌' });
  }

  const user = verifyToken(token);
  if (!user) {
    return res.status(403).json({ code: 403, message: '无效的令牌' });
  }

  req.user = user;
  next();
}

// 验证管理员权限
function authorizeAdmin(req, res, next) {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ code: 403, message: '需要管理员权限' });
  }
  next();
}

module.exports = {
  authenticateToken,
  authorizeAdmin
};