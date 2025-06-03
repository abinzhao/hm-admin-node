const jwt = require('jsonwebtoken');
const { errorResponse } = require('../utils/response');

const JWT_SECRET = 'hmos-app-secret-key';

// 生成token
function generateToken(user) {
  return jwt.sign(
    { 
      id: user.id, 
      userId: user.userId, 
      username: user.username,
      role: user.role 
    },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
}

// 验证token中间件
function authMiddleware(req, res, next) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  
  if (!token) {
    return res.status(401).json(errorResponse('未提供认证token', 401));
  }
  
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json(errorResponse('token无效或已过期', 401));
  }
}

module.exports = { generateToken, authMiddleware, JWT_SECRET };
