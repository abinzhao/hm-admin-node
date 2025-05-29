const Joi = require('joi');

// 用户注册验证
const registerSchema = Joi.object({
  username: Joi.string().min(3).max(30).required(),
  password: Joi.string().pattern(new RegExp('^[a-zA-Z0-9]{6,30}$')).required(),
  email: Joi.string().email().required(),
  phone: Joi.string().pattern(new RegExp('^1[3-9]\\d{9}$')).optional()
});

// 用户登录验证
const loginSchema = Joi.object({
  username: Joi.string().min(3).max(30).required(),
  password: Joi.string().pattern(new RegExp('^[a-zA-Z0-9]{6,30}$')).required()
});

// 内容验证
const contentSchema = Joi.object({
  title: Joi.string().required(),
  description: Joi.string().optional(),
  contentType: Joi.string().valid('article', 'question', 'codeSnippet', 'softwarePackage').required(),
  tags: Joi.array().items(Joi.string()).optional(),
  content: Joi.string().required()
});

// 代办事项验证
const todoSchema = Joi.object({
  title: Joi.string().required(),
  description: Joi.string().optional(),
  status: Joi.string().valid('pending', 'completed', 'inProgress').required(),
  priority: Joi.string().valid('low', 'medium', 'high').required(),
  dueDate: Joi.date().optional()
});

// 留言验证
const commentSchema = Joi.object({
  userId: Joi.number().integer().required(),
  content: Joi.string().required(),
  contentType: Joi.string().valid('article', 'question', 'codeSnippet', 'softwarePackage').required()
});

// 系统公告验证
const announcementSchema = Joi.object({
  title: Joi.string().required(),
  content: Joi.string().required(),
  publisherId: Joi.string().required()
});

module.exports = {
  registerSchema,
  loginSchema,
  contentSchema,
  todoSchema,
  commentSchema,
  announcementSchema
};