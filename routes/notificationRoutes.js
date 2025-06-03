const express = require('express');
const { db } = require('../config/database');
const { authMiddleware } = require('../middleware/auth');
const { successResponse, errorResponse } = require('../utils/response');

const router = express.Router();

// 新增通知（仅管理员）
router.post('/', authMiddleware, (req, res) => {
  if (req.user.role !== 'admin') {
    return res.json(errorResponse('无权限发布通知', 403));
  }
  
  const { title, content } = req.body;
  const publisher = req.user.nickname || req.user.username;
  
  if (!title || !content) {
    return res.json(errorResponse('标题和内容不能为空'));
  }
  
  db.run(
    'INSERT INTO notifications (title, content, publisher) VALUES (?, ?, ?)',
    [title, content, publisher],
    function(err) {
      if (err) {
        return res.json(errorResponse('发布通知失败'));
      }
      
      res.json(successResponse({ id: this.lastID }, '发布成功'));
    }
  );
});

// 查询通知（分页）
router.get('/', (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const offset = (page - 1) * limit;
  
  // 获取总数
  db.get('SELECT COUNT(*) as total FROM notifications', (err, countResult) => {
    if (err) {
      return res.json(errorResponse('数据库错误'));
    }
    
    // 获取分页数据
    db.all(
      'SELECT * FROM notifications ORDER BY createTime DESC LIMIT ? OFFSET ?',
      [limit, offset],
      (err, notifications) => {
        if (err) {
          return res.json(errorResponse('数据库错误'));
        }
        
        res.json(successResponse({
          list: notifications,
          total: countResult.total,
          page,
          limit
        }));
      }
    );
  });
});

// 修改通知（仅管理员）
router.put('/:id', authMiddleware, (req, res) => {
  if (req.user.role !== 'admin') {
    return res.json(errorResponse('无权限修改通知', 403));
  }
  
  const { id } = req.params;
  const { title, content } = req.body;
  
  if (!title || !content) {
    return res.json(errorResponse('标题和内容不能为空'));
  }
  
  db.run(
    'UPDATE notifications SET title = ?, content = ?, updateTime = CURRENT_TIMESTAMP WHERE id = ?',
    [title, content, id],
    function(err) {
      if (err) {
        return res.json(errorResponse('修改失败'));
      }
      
      if (this.changes === 0) {
        return res.json(errorResponse('通知不存在'));
      }
      
      res.json(successResponse(null, '修改成功'));
    }
  );
});

// 删除通知（仅管理员）
router.delete('/:id', authMiddleware, (req, res) => {
  if (req.user.role !== 'admin') {
    return res.json(errorResponse('无权限删除通知', 403));
  }
  
  const { id } = req.params;
  
  db.run('DELETE FROM notifications WHERE id = ?', [id], function(err) {
    if (err) {
      return res.json(errorResponse('删除失败'));
    }
    
    if (this.changes === 0) {
      return res.json(errorResponse('通知不存在'));
    }
    
    res.json(successResponse(null, '删除成功'));
  });
});

module.exports = router;
