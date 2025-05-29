const express = require('express');
const router = express.Router();
const Joi = require('joi');
const authService = require('../../services/authService');
const { registerSchema, loginSchema } = require('../../utils/validator');
const logger = require('../../utils/logger');

// 用户注册
router.post('/register', async (req, res, next) => {
  try {
    // 验证请求数据
    const { error } = registerSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        code: 400,
        message: '参数验证失败',
        details: error.details
      });
    }
    
    const { username, password, email, phone } = req.body;
    
    // 注册用户
    const result = await authService.register(username, password, email, phone);
    
    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
});

// 用户登录
router.post('/login', async (req, res, next) => {
  try {
    // 验证请求数据
    const { error } = loginSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        code: 400,
        message: '参数验证失败',
        details: error.details
      });
    }
    
    const { username, password } = req.body;
    
    // 用户登录
    const result = await authService.login(username, password);
    
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
});

module.exports = router;