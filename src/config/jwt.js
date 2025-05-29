const jwt = require('jsonwebtoken');

// JWT密钥和配置
const secretKey = process.env.JWT_SECRET || 'your-secret-key';
const expiresIn = process.env.JWT_EXPIRES_IN || '24h';

// 生成JWT令牌
function generateToken(payload) {
  return jwt.sign(payload, secretKey, { expiresIn });
}

// 验证JWT令牌
function verifyToken(token) {
  try {
    return jwt.verify(token, secretKey);
  } catch (error) {
    return null;
  }
}

module.exports = {
  generateToken,
  verifyToken,
  secretKey
};