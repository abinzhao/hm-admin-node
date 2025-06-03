const express = require('express');
const { db } = require('../config/database');
const { authMiddleware } = require('../middleware/auth');
const { successResponse, errorResponse } = require('../utils/response');

const router = express.Router();

// 新增留言
router.post('/', authMiddleware, (req, res) => {
  const { targetId, targetType, content } = req.body;
  const userId = req.user.id;
  
  if (!targetId || !targetType || !content) {
    return res.json(errorResponse('目标ID、目标类型和留言内容不能为空'));
  }
  
  db.run(
    'INSERT INTO messages (userId, targetId, targetType, content) VALUES (?, ?, ?, ?)',
    [userId, targetId, targetType, content],
    function(err) {
      if (err) {
        return res.json(errorResponse('发表留言失败'));
      }
      
      res.json(successResponse({ id: this.lastID }, '留言成功'));
    }
  );
});

// 查询某个内容/应用下的所有留言
router.get('/:targetType/:targetId', (req, res) => {
  const { targetType, targetId } = req.params;
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const offset = (page - 1) * limit;
  
  // 获取总数
  db.get(
    'SELECT COUNT(*) as total FROM messages WHERE targetType = ? AND targetId = ?',
    [targetType, targetId],
    (err, countResult) => {
      if (err) {
        return res.json(errorResponse('数据库错误'));
      }
      
      // 获取分页数据
      db.all(
        `SELECT m.*, u.username, u.nickname, u.avatar 
         FROM messages m 
         LEFT JOIN users u ON m.userId = u.id 
         WHERE m.targetType = ? AND m.targetId = ? 
         ORDER BY m.createTime DESC 
         LIMIT ? OFFSET ?`,
        [targetType, targetId, limit, offset],
        (err, messages) => {
          if (err) {
            return res.json(errorResponse('数据库错误'));
          }
          
          res.json(successResponse({
            list: messages,
            total: countResult.total,
            page,
            limit
          }));
        }
      );
    }
  );
});

// 修改留言
router.put('/:id', authMiddleware, (req, res) => {
  const { id } = req.params;
  const { content } = req.body;
  
  if (!content) {
    return res.json(errorResponse('留言内容不能为空'));
  }
  
  // 检查权限
  db.get('SELECT userId FROM messages WHERE id = ?', [id], (err, messageData) => {
    if (err) {
      return res.json(errorResponse('数据库错误'));
    }
    
    if (!messageData) {
      return res.json(errorResponse('留言不存在'));
    }
    
    if (messageData.userId !== req.user.id && req.user.role !== 'admin') {
      return res.json(errorResponse('无权限修改此留言', 403));
    }
    
    db.run(
      'UPDATE messages SET content = ? WHERE id = ?',
      [content, id],
      function(err) {
        if (err) {
          return res.json(errorResponse('修改失败'));
        }
        
        res.json(successResponse(null, '修改成功'));
      }
    );
  });
});

// 删除留言
router.delete('/:id', authMiddleware, (req, res) => {
  const { id } = req.params;
  
  // 检查权限
  db.get('SELECT userId FROM messages WHERE id = ?', [id], (err, messageData) => {
    if (err) {
      return res.json(errorResponse('数据库错误'));
    }
    
    if (!messageData) {
      return res.json(errorResponse('留言不存在'));
    }
    
    if (messageData.userId !== req.user.id && req.user.role !== 'admin') {
      return res.json(errorResponse('无权限删除此留言', 403));
    }
    
    db.run('DELETE FROM messages WHERE id = ?', [id], function(err) {
      if (err) {
        return res.json(errorResponse('删除失败'));
      }
      
      res.json(successResponse(null, '删除成功'));
    });
  });
});

module.exports = router;
