const express = require('express');
const router = express.Router();
const userService = require('../../services/userService');
const { authenticateToken, authorizeAdmin } = require('../../middleware/auth');
const logger = require('../../utils/logger');

// 获取所有用户
router.get('/', authenticateToken, authorizeAdmin, async (req, res, next) => {
  try {
    const result = await userService.getAllUsers();
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
});

// 获取单个用户
router.get('/:id', authenticateToken, async (req, res, next) => {
  try {
    const { id } = req.params;
    
    // 普通用户只能查看自己的信息，管理员可以查看所有用户信息
    if (req.user.role !== 'admin' && req.user.id !== id) {
      return res.status(403).json({
        code: 403,
        message: '权限不足'
      });
    }
    
    const result = await userService.getUserById(id);
    res.status(result.code).json(result);
  } catch (error) {
    next(error);
  }
});

// 创建用户（管理员）
router.post('/', authenticateToken, authorizeAdmin, async (req, res, next) => {
  try {
    const result = await userService.createUser(req.body);
    res.status(result.code).json(result);
  } catch (error) {
    next(error);
  }
});

// 更新用户信息
router.put('/:id', authenticateToken, async (req, res, next) => {
  try {
    const { id } = req.params;
    
    // 普通用户只能更新自己的信息，管理员可以更新所有用户信息
    if (req.user.role !== 'admin' && req.user.id !== id) {
      return res.status(403).json({
        code: 403,
        message: '权限不足'
      });
    }
    
    const result = await userService.updateUser(id, req.body);
    res.status(result.code).json(result);
  } catch (error) {
    next(error);
  }
});

// 更新用户密码
router.put('/:id/password', authenticateToken, async (req, res, next) => {
  try {
    const { id } = req.params;
    const { oldPassword, newPassword } = req.body;
    
    // 用户只能更新自己的密码
    if (req.user.id !== id) {
      return res.status(403).json({
        code: 403,
        message: '权限不足'
      });
    }
    
    const result = await userService.updatePassword(id, oldPassword, newPassword);
    res.status(result.code).json(result);
  } catch (error) {
    next(error);
  }
});

// 更新用户头像
router.put('/:id/avatar', authenticateToken, async (req, res, next) => {
  try {
    const { id } = req.params;
    const { avatarUrl } = req.body;
    
    // 用户只能更新自己的头像
    if (req.user.id !== id) {
      return res.status(403).json({
        code: 403,
        message: '权限不足'
      });
    }
    
    const result = await userService.updateAvatar(id, avatarUrl);
    res.status(result.code).json(result);
  } catch (error) {
    next(error);
  }
});

// 删除用户（管理员）
router.delete('/:id', authenticateToken, authorizeAdmin, async (req, res, next) => {
  try {
    const { id } = req.params;
    const result = await userService.deleteUser(id);
    res.status(result.code).json(result);
  } catch (error) {
    next(error);
  }
});

module.exports = router;