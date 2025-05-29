const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const logger = require('./utils/logger');
const errorHandler = require('./middleware/errorHandler');

const app = express();

// 安全中间件
app.use(helmet());

// 跨域支持
app.use(cors());

// 请求体解析
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// 限流中间件
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15分钟
  max: 1000, // 限制每IP每15分钟最多1000次请求
  message: '请求过于频繁，请稍后再试'
});
app.use(limiter);

// API路由
app.use('/api/auth', require('./api/auth'));
app.use('/api/users', require('./api/users'));
app.use('/api/content', require('./api/content'));
app.use('/api/todos', require('./api/todos'));
app.use('/api/comments', require('./api/comments'));
app.use('/api/announcements', require('./api/announcements'));

// 404处理
app.use((req, res, next) => {
  res.status(404).json({
    code: 404,
    message: '未找到该API'
  });
});

// 错误处理
app.use(errorHandler);

module.exports = app;