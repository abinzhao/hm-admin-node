const { pool } = require('../config/database');
const { hashPassword, verifyPassword } = require('../utils/encryption');
const { v4: uuidv4 } = require('uuid');

// 创建用户
async function createUser(userData) {
  const { username, password, email, phone } = userData;
  const hashedPassword = await hashPassword(password);
  const userId = `user_${uuidv4().split('-')[0]}`;
  const createTime = new Date().toISOString().slice(0, 19).replace('T', ' ');

  const [result] = await pool.execute(
    'INSERT INTO users (id, userId, username, passWord, email, phone, createTime) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [uuidv4(), userId, username, hashedPassword, email, phone, createTime]
  );

  return { id: result.insertId, userId };
}

// 根据用户名查找用户
async function findUserByUsername(username) {
  const [rows] = await pool.execute('SELECT * FROM users WHERE username = ?', [username]);
  return rows[0];
}

// 根据ID查找用户
async function findUserById(id) {
  const [rows] = await pool.execute('SELECT * FROM users WHERE id = ?', [id]);
  return rows[0];
}

// 获取所有用户
async function getAllUsers() {
  const [rows] = await pool.execute('SELECT * FROM users');
  return rows;
}

// 更新用户信息
async function updateUser(id, userData) {
  const { username, email, phone, nickname, avatar, role } = userData;
  const [result] = await pool.execute(
    'UPDATE users SET username = ?, email = ?, phone = ?, nickname = ?, avatar = ?, role = ? WHERE id = ?',
    [username, email, phone, nickname, avatar, role, id]
  );
  return result.affectedRows > 0;
}

// 更新用户密码
async function updatePassword(id, oldPassword, newPassword) {
  const user = await findUserById(id);
  if (!user) {
    return false;
  }

  const isPasswordValid = await verifyPassword(oldPassword, user.passWord);
  if (!isPasswordValid) {
    return false;
  }

  const hashedPassword = await hashPassword(newPassword);
  const [result] = await pool.execute('UPDATE users SET passWord = ? WHERE id = ?', [hashedPassword, id]);
  return result.affectedRows > 0;
}

// 更新用户头像
async function updateAvatar(id, avatarUrl) {
  const [result] = await pool.execute('UPDATE users SET avatar = ? WHERE id = ?', [avatarUrl, id]);
  return result.affectedRows > 0;
}

// 删除用户
async function deleteUser(id) {
  const [result] = await pool.execute('DELETE FROM users WHERE id = ?', [id]);
  return result.affectedRows > 0;
}

module.exports = {
  createUser,
  findUserByUsername,
  findUserById,
  getAllUsers,
  updateUser,
  updatePassword,
  updateAvatar,
  deleteUser
};