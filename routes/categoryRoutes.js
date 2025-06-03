const express = require('express');
const { db } = require('../config/database');
const { authMiddleware } = require('../middleware/auth');
const { successResponse, errorResponse } = require('../utils/response');

const router = express.Router();

// 新增分类（仅管理员）
router.post('/', authMiddleware, (req, res) => {
  if (req.user.role !== 'admin') {
    return res.json(errorResponse('无权限创建分类', 403));
  }
  
  const { type, title } = req.body;
  
  if (!type || !title) {
    return res.json(errorResponse('类型和标题不能为空'));
  }
  
  if (!['app', 'content'].includes(type)) {
    return res.json(errorResponse('类型只能是app或content'));
  }
  
  db.run(
    'INSERT INTO categories (type, title) VALUES (?, ?)',
    [type, title],
    function(err) {
      if (err) {
        return res.json(errorResponse('创建分类失败'));
      }
      
      res.json(successResponse({ id: this.lastID }, '创建成功'));
    }
  );
});

// 查询所有分类
router.get('/', (req, res) => {
  const type = req.query.type;
  
  let whereClause = '';
  let params = [];
  
  if (type) {
    whereClause = 'WHERE type = ?';
    params.push(type);
  }
  
  db.all(
    `SELECT * FROM categories ${whereClause} ORDER BY createTime ASC`,
    params,
    (err, categories) => {
      if (err) {
        return res.json(errorResponse('数据库错误'));
      }
      
      res.json(successResponse(categories));
    }
  );
});

// 修改分类（仅管理员）
router.put('/:id', authMiddleware, (req, res) => {
  if (req.user.role !== 'admin') {
    return res.json(errorResponse('无权限修改分类', 403));
  }
  
  const { id } = req.params;
  const { title } = req.body;
  
  if (!title) {
    return res.json(errorResponse('标题不能为空'));
  }
  
  db.run(
    'UPDATE categories SET title = ? WHERE id = ?',
    [title, id],
    function(err) {
      if (err) {
        return res.json(errorResponse('修改失败'));
      }
      
      if (this.changes === 0) {
        return res.json(errorResponse('分类不存在'));
      }
      
      res.json(successResponse(null, '修改成功'));
    }
  );
});

// 删除分类（仅管理员）
router.delete('/:id', authMiddleware, (req, res) => {
  if (req.user.role !== 'admin') {
    return res.json(errorResponse('无权限删除分类', 403));
  }
  
  const { id } = req.params;
  
  db.run('DELETE FROM categories WHERE id = ?', [id], function(err) {
    if (err) {
      return res.json(errorResponse('删除失败'));
    }
    
    if (this.changes === 0) {
      return res.json(errorResponse('分类不存在'));
    }
    
    res.json(successResponse(null, '删除成功'));
  });
});

module.exports = router;
