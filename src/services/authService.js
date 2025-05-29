const userModel = require('../models/user');
const { generateToken } = require('../config/jwt');
const { verifyPassword } = require('../utils/encryption');
const logger = require('../utils/logger');

// 用户注册
async function register(username, password, email, phone) {
  try {
    // 检查用户名是否已存在
    const existingUser = await userModel.findUserByUsername(username);
    if (existingUser) {
      throw new Error('用户名已存在');
    }

    // 创建新用户
    const userData = { username, password, email, phone };
    const user = await userModel.createUser(userData);
    
    return {
      code: 200,
      message: '注册成功',
      data: user
    };
  } catch (error) {
    logger.error('注册失败:', error);
    throw error;
  }
}

// 用户登录
async function login(username, password) {
  try {
    // 查找用户
    const user = await userModel.findUserByUsername(username);
    if (!user) {
      throw new Error('用户名或密码错误');
    }

    // 验证密码
    const isPasswordValid = await verifyPassword(password, user.passWord);
    if (!isPasswordValid) {
      throw new Error('用户名或密码错误');
    }

    // 生成JWT令牌
    const token = generateToken({
      id: user.id,
      username: user.username,
      role: user.role
    });

    return {
      code: 200,
      message: '登录成功',
      data: {
        token,
        user: {
          id: user.id,
          username: user.username,
          role: user.role
        }
      }
    };
  } catch (error) {
    logger.error('登录失败:', error);
    throw error;
  }
}

module.exports = {
  register,
  login
};