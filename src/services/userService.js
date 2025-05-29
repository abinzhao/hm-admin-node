const userModel = require('../models/user');
const logger = require('../utils/logger');

// 获取所有用户
async function getAllUsers() {
  try {
    const users = await userModel.getAllUsers();
    return {
      code: 200,
      message: '获取用户列表成功',
      data: users
    };
  } catch (error) {
    logger.error('获取用户列表失败:', error);
    throw error;
  }
}

// 获取单个用户
async function getUserById(id) {
  try {
    const user = await userModel.findUserById(id);
    if (!user) {
      return {
        code: 404,
        message: '用户不存在'
      };
    }
    
    return {
      code: 200,
      message: '获取用户成功',
      data: user
    };
  } catch (error) {
    logger.error('获取用户失败:', error);
    throw error;
  }
}

// 创建用户
async function createUser(userData) {
  try {
    const user = await userModel.createUser(userData);
    return {
      code: 201,
      message: '创建用户成功',
      data: user
    };
  } catch (error) {
    logger.error('创建用户失败:', error);
    throw error;
  }
}

// 更新用户
async function updateUser(id, userData) {
  try {
    const isUpdated = await userModel.updateUser(id, userData);
    if (!isUpdated) {
      return {
        code: 404,
        message: '用户不存在'
      };
    }
    
    const updatedUser = await userModel.findUserById(id);
    return {
      code: 200,
      message: '更新用户成功',
      data: updatedUser
    };
  } catch (error) {
    logger.error('更新用户失败:', error);
    throw error;
  }
}

// 更新用户密码
async function updatePassword(id, oldPassword, newPassword) {
  try {
    const isUpdated = await userModel.updatePassword(id, oldPassword, newPassword);
    if (!isUpdated) {
      return {
        code: 400,
        message: '原密码错误'
      };
    }
    
    return {
      code: 200,
      message: '更新密码成功'
    };
  } catch (error) {
    logger.error('更新密码失败:', error);
    throw error;
  }
}

// 更新用户头像
async function updateAvatar(id, avatarUrl) {
  try {
    const isUpdated = await userModel.updateAvatar(id, avatarUrl);
    if (!isUpdated) {
      return {
        code: 404,
        message: '用户不存在'
      };
    }
    
    return {
      code: 200,
      message: '更新头像成功',
      data: { avatarUrl }
    };
  } catch (error) {
    logger.error('更新头像失败:', error);
    throw error;
  }
}

// 删除用户
async function deleteUser(id) {
  try {
    const isDeleted = await userModel.deleteUser(id);
    if (!isDeleted) {
      return {
        code: 404,
        message: '用户不存在'
      };
    }
    
    return {
      code: 200,
      message: '删除用户成功'
    };
  } catch (error) {
    logger.error('删除用户失败:', error);
    throw error;
  }
}

module.exports = {
  getAllUsers,
  getUserById,
  createUser,
  updateUser,
  updatePassword,
  updateAvatar,
  deleteUser
};