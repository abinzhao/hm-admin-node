const bcrypt = require('bcryptjs');

// 加密密码
async function hashPassword(password) {
  const saltRounds = 10;
  return bcrypt.hash(password, saltRounds);
}

// 验证密码
async function verifyPassword(password, hashedPassword) {
  return bcrypt.compare(password, hashedPassword);
}

module.exports = {
  hashPassword,
  verifyPassword
};