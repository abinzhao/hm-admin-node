const express = require('express');
const bcrypt = require('bcryptjs');
const { db } = require('../config/database');
const { generateToken, authMiddleware } = require('../middleware/auth');
const { successResponse, errorResponse } = require('../utils/response');

const router = express.Router();

// 用户注册
router.post('/register', async (req, res) => {
  const { username, password, nickname, email, phone } = req.body;
  
  if (!username || !password) {
    return res.json(errorResponse('用户名和密码不能为空'));
  }
  
  try {
    // 检查用户名是否已存在
    db.get('SELECT * FROM users WHERE username = ?', [username], async (err, user) => {
      if (err) {
        return res.json(errorResponse('数据库错误'));
      }
      
      if (user) {
        return res.json(errorResponse('用户名已存在'));
      }
      
      // 加密密码
      const hashedPassword = await bcrypt.hash(password, 10);
      const userId = 'user_' + Date.now();
      
      // 插入新用户
      db.run(
        'INSERT INTO users (userId, username, password, nickname, email, phone) VALUES (?, ?, ?, ?, ?, ?)',
        [userId, username, hashedPassword, nickname || username, email, phone],
        function(err) {
          if (err) {
            return res.json(errorResponse('注册失败'));
          }
          
          res.json(successResponse({ userId }, '注册成功'));
        }
      );
    });
  } catch (error) {
    res.json(errorResponse('服务器错误'));
  }
});

// 用户登录
router.post('/login', (req, res) => {
  const { username, password } = req.body;
  
  if (!username || !password) {
    return res.json(errorResponse('用户名和密码不能为空'));
  }
  
  db.get('SELECT * FROM users WHERE username = ?', [username], async (err, user) => {
    if (err) {
      return res.json(errorResponse('数据库错误'));
    }
    
    if (!user) {
      return res.json(errorResponse('用户不存在'));
    }
    
    // 验证密码
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return res.json(errorResponse('密码错误'));
    }
    
    // 生成token
    const token = generateToken(user);
    
    // 返回用户信息（不包含密码）
    const { password: _, ...userInfo } = user;
    userInfo.tags = userInfo.tags ? JSON.parse(userInfo.tags) : [];
    
    res.json(successResponse({ token, userInfo }, '登录成功'));
  });
});

// 查询单个用户信息
router.get('/:userId', authMiddleware, (req, res) => {
  const { userId } = req.params;
  
  db.get('SELECT * FROM users WHERE userId = ?', [userId], (err, user) => {
    if (err) {
      return res.json(errorResponse('数据库错误'));
    }
    
    if (!user) {
      return res.json(errorResponse('用户不存在'));
    }
    
    const { password: _, ...userInfo } = user;
    userInfo.tags = userInfo.tags ? JSON.parse(userInfo.tags) : [];
    
    res.json(successResponse(userInfo));
  });
});

// 查询所有用户信息（分页）
router.get('/', authMiddleware, (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const offset = (page - 1) * limit;
  
  // 获取总数
  db.get('SELECT COUNT(*) as total FROM users', (err, countResult) => {
    if (err) {
      return res.json(errorResponse('数据库错误'));
    }
    
    // 获取分页数据
    db.all(
      'SELECT * FROM users ORDER BY createTime DESC LIMIT ? OFFSET ?',
      [limit, offset],
      (err, users) => {
        if (err) {
          return res.json(errorResponse('数据库错误'));
        }
        
        const userList = users.map(user => {
          const { password: _, ...userInfo } = user;
          userInfo.tags = userInfo.tags ? JSON.parse(userInfo.tags) : [];
          return userInfo;
        });
        
        res.json(successResponse({
          list: userList,
          total: countResult.total,
          page,
          limit
        }));
      }
    );
  });
});

// 修改用户信息
router.put('/:userId', authMiddleware, (req, res) => {
  const { userId } = req.params;
  const { nickname, email, phone, description, avatar, tags } = req.body;
  
  // 检查权限（只能修改自己的信息或管理员）
  if (req.user.userId !== userId && req.user.role !== 'admin') {
    return res.json(errorResponse('无权限修改此用户信息', 403));
  }
  
  const tagsJson = tags ? JSON.stringify(tags) : null;
  
  db.run(
    'UPDATE users SET nickname = ?, email = ?, phone = ?, description = ?, avatar = ?, tags = ? WHERE userId = ?',
    [nickname, email, phone, description, avatar, tagsJson, userId],
    function(err) {
      if (err) {
        return res.json(errorResponse('修改失败'));
      }
      
      if (this.changes === 0) {
        return res.json(errorResponse('用户不存在'));
      }
      
      res.json(successResponse(null, '修改成功'));
    }
  );
});

// 删除用户
router.delete('/:userId', authMiddleware, (req, res) => {
  const { userId } = req.params;
  
  // 只有管理员可以删除用户
  if (req.user.role !== 'admin') {
    return res.json(errorResponse('无权限删除用户', 403));
  }
  
  db.run('DELETE FROM users WHERE userId = ?', [userId], function(err) {
    if (err) {
      return res.json(errorResponse('删除失败'));
    }
    
    if (this.changes === 0) {
      return res.json(errorResponse('用户不存在'));
    }
    
    res.json(successResponse(null, '删除成功'));
  });
});

module.exports = router;
