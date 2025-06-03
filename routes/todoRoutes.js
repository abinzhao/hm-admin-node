const express = require('express');
const { db } = require('../config/database');
const { authMiddleware } = require('../middleware/auth');
const { successResponse, errorResponse } = require('../utils/response');

const router = express.Router();

// 新增代办事项
router.post('/', authMiddleware, (req, res) => {
  const { title, description, priority, dueDate } = req.body;
  const userId = req.user.id;
  
  if (!title) {
    return res.json(errorResponse('标题不能为空'));
  }
  
  db.run(
    'INSERT INTO todos (userId, title, description, priority, dueDate) VALUES (?, ?, ?, ?, ?)',
    [userId, title, description, priority || 'medium', dueDate],
    function(err) {
      if (err) {
        return res.json(errorResponse('创建代办事项失败'));
      }
      
      res.json(successResponse({ id: this.lastID }, '创建成功'));
    }
  );
});

// 查询某个代办内容
router.get('/:id', authMiddleware, (req, res) => {
  const { id } = req.params;
  
  db.get(
    `SELECT t.*, u.username, u.nickname 
     FROM todos t 
     LEFT JOIN users u ON t.userId = u.id 
     WHERE t.id = ?`,
    [id],
    (err, todo) => {
      if (err) {
        return res.json(errorResponse('数据库错误'));
      }
      
      if (!todo) {
        return res.json(errorResponse('代办事项不存在'));
      }
      
      // 检查权限
      if (todo.userId !== req.user.id && req.user.role !== 'admin') {
        return res.json(errorResponse('无权限查看此代办事项', 403));
      }
      
      res.json(successResponse(todo));
    }
  );
});

// 查询某个用户下的所有代办（分页）
router.get('/user/:userId', authMiddleware, (req, res) => {
  const { userId } = req.params;
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const offset = (page - 1) * limit;
  const status = req.query.status;
  
  // 检查权限
  if (parseInt(userId) !== req.user.id && req.user.role !== 'admin') {
    return res.json(errorResponse('无权限查看此用户的代办事项', 403));
  }
  
  let whereClause = 'WHERE userId = ?';
  let params = [userId];
  
  if (status) {
    whereClause += ' AND status = ?';
    params.push(status);
  }
  
  // 获取总数
  db.get(`SELECT COUNT(*) as total FROM todos ${whereClause}`, params, (err, countResult) => {
    if (err) {
      return res.json(errorResponse('数据库错误'));
    }
    
    // 获取分页数据
    params.push(limit, offset);
    db.all(
      `SELECT * FROM todos ${whereClause} ORDER BY createTime DESC LIMIT ? OFFSET ?`,
      params,
      (err, todos) => {
        if (err) {
          return res.json(errorResponse('数据库错误'));
        }
        
        res.json(successResponse({
          list: todos,
          total: countResult.total,
          page,
          limit
        }));
      }
    );
  });
});

// 查询所有用户的代办（分页，仅管理员）
router.get('/', authMiddleware, (req, res) => {
  if (req.user.role !== 'admin') {
    return res.json(errorResponse('无权限查看所有代办事项', 403));
  }
  
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const offset = (page - 1) * limit;
  const status = req.query.status;
  
  let whereClause = '';
  let params = [];
  
  if (status) {
    whereClause = 'WHERE t.status = ?';
    params.push(status);
  }
  
  // 获取总数
  db.get(`SELECT COUNT(*) as total FROM todos t ${whereClause}`, params, (err, countResult) => {
    if (err) {
      return res.json(errorResponse('数据库错误'));
    }
    
    // 获取分页数据
    params.push(limit, offset);
    db.all(
      `SELECT t.*, u.username, u.nickname 
       FROM todos t 
       LEFT JOIN users u ON t.userId = u.id 
       ${whereClause}
       ORDER BY t.createTime DESC 
       LIMIT ? OFFSET ?`,
      params,
      (err, todos) => {
        if (err) {
          return res.json(errorResponse('数据库错误'));
        }
        
        res.json(successResponse({
          list: todos,
          total: countResult.total,
          page,
          limit
        }));
      }
    );
  });
});

// 修改代办事项
router.put('/:id', authMiddleware, (req, res) => {
  const { id } = req.params;
  const { title, description, status, priority, dueDate } = req.body;
  
  // 检查权限
  db.get('SELECT userId FROM todos WHERE id = ?', [id], (err, todoData) => {
    if (err) {
      return res.json(errorResponse('数据库错误'));
    }
    
    if (!todoData) {
      return res.json(errorResponse('代办事项不存在'));
    }
    
    if (todoData.userId !== req.user.id && req.user.role !== 'admin') {
      return res.json(errorResponse('无权限修改此代办事项', 403));
    }
    
    db.run(
      'UPDATE todos SET title = ?, description = ?, status = ?, priority = ?, dueDate = ?, updateTime = CURRENT_TIMESTAMP WHERE id = ?',
      [title, description, status, priority, dueDate, id],
      function(err) {
        if (err) {
          return res.json(errorResponse('修改失败'));
        }
        
        res.json(successResponse(null, '修改成功'));
      }
    );
  });
});

// 删除代办事项
router.delete('/:id', authMiddleware, (req, res) => {
  const { id } = req.params;
  
  // 检查权限
  db.get('SELECT userId FROM todos WHERE id = ?', [id], (err, todoData) => {
    if (err) {
      return res.json(errorResponse('数据库错误'));
    }
    
    if (!todoData) {
      return res.json(errorResponse('代办事项不存在'));
    }
    
    if (todoData.userId !== req.user.id && req.user.role !== 'admin') {
      return res.json(errorResponse('无权限删除此代办事项', 403));
    }
    
    db.run('DELETE FROM todos WHERE id = ?', [id], function(err) {
      if (err) {
        return res.json(errorResponse('删除失败'));
      }
      
      res.json(successResponse(null, '删除成功'));
    });
  });
});

module.exports = router;
