const express = require('express');
const router = express.Router();
const todoService = require('../../services/todoService');
const { authenticateToken } = require('../../middleware/auth');
const logger = require('../../utils/logger');

// 获取用户的所有代办事项
router.get('/:userId', authenticateToken, async (req, res, next) => {
  try {
    const { userId } = req.params;
    
    // 普通用户只能查看自己的代办事项，管理员可以查看所有用户的代办事项
    if (req.user.role !== 'admin' && req.user.id !== userId) {
      return res.status(403).json({
        code: 403,
        message: '权限不足'
      });
    }
    
    const result = await todoService.getTodosByUserId(userId);
    res.status(result.code).json(result);
  } catch (error) {
    next(error);
  }
});

// 创建代办事项
router.post('/:userId', authenticateToken, async (req, res, next) => {
  try {
    const { userId } = req.params;
    
    // 用户只能为自己创建代办事项
    if (req.user.id !== userId) {
      return res.status(403).json({
        code: 403,
        message: '权限不足'
      });
    }
    
    const result = await todoService.createTodo(userId, req.body);
    res.status(result.code).json(result);
  } catch (error) {
    next(error);
  }
});

// 获取单个代办事项
router.get('/:userId/:id', authenticateToken, async (req, res, next) => {
  try {
    const { userId, id } = req.params;
    
    // 普通用户只能查看自己的代办事项，管理员可以查看所有用户的代办事项
    if (req.user.role !== 'admin' && req.user.id !== userId) {
      return res.status(403).json({
        code: 403,
        message: '权限不足'
      });
    }
    
    const result = await todoService.getTodoById(id);
    res.status(result.code).json(result);
  } catch (error) {
    next(error);
  }
});

// 更新代办事项
router.put('/:userId/:id', authenticateToken, async (req, res, next) => {
  try {
    const { userId, id } = req.params;
    
    // 普通用户只能更新自己的代办事项，管理员可以更新所有用户的代办事项
    if (req.user.role !== 'admin' && req.user.id !== userId) {
      return res.status(403).json({
        code: 403,
        message: '权限不足'
      });
    }
    
    const result = await todoService.updateTodo(id, req.body);
    res.status(result.code).json(result);
  } catch (error) {
    next(error);
  }
});

// 删除代办事项
router.delete('/:userId/:id', authenticateToken, async (req, res, next) => {
  try {
    const { userId, id } = req.params;
    
    // 普通用户只能删除自己的代办事项，管理员可以删除所有用户的代办事项
    if (req.user.role !== 'admin' && req.user.id !== userId) {
      return res.status(403).json({
        code: 403,
        message: '权限不足'
      });
    }
    
    const result = await todoService.deleteTodo(id);
    res.status(result.code).json(result);
  } catch (error) {
    next(error);
  }
});

module.exports = router;