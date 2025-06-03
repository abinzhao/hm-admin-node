const express = require('express');
const { db } = require('../config/database');
const { authMiddleware } = require('../middleware/auth');
const { successResponse, errorResponse } = require('../utils/response');

const router = express.Router();

// 新增内容
router.post('/', authMiddleware, (req, res) => {
  const { title, description, contentType, tags, coverImage, content } = req.body;
  const userId = req.user.id;
  
  if (!title || !contentType || !content) {
    return res.json(errorResponse('标题、内容类型和内容不能为空'));
  }
  
  const tagsJson = tags ? JSON.stringify(tags) : null;
  const coverImageJson = coverImage ? JSON.stringify(coverImage) : null;
  
  db.run(
    'INSERT INTO contents (userId, title, description, contentType, tags, coverImage, content) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [userId, title, description, contentType, tagsJson, coverImageJson, content],
    function(err) {
      if (err) {
        return res.json(errorResponse('创建内容失败'));
      }
      
      res.json(successResponse({ id: this.lastID }, '创建成功'));
    }
  );
});

// 查询单个内容
router.get('/:id', (req, res) => {
  const { id } = req.params;
  
  db.get(
    `SELECT c.*, u.username, u.nickname, u.avatar 
     FROM contents c 
     LEFT JOIN users u ON c.userId = u.id 
     WHERE c.id = ?`,
    [id],
    (err, content) => {
      if (err) {
        return res.json(errorResponse('数据库错误'));
      }
      
      if (!content) {
        return res.json(errorResponse('内容不存在'));
      }
      
      content.tags = content.tags ? JSON.parse(content.tags) : [];
      content.coverImage = content.coverImage ? JSON.parse(content.coverImage) : [];
      
      res.json(successResponse(content));
    }
  );
});

// 查询某个用户下的所有内容（分页）
router.get('/user/:userId', (req, res) => {
  const { userId } = req.params;
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const offset = (page - 1) * limit;
  
  // 获取总数
  db.get('SELECT COUNT(*) as total FROM contents WHERE userId = ?', [userId], (err, countResult) => {
    if (err) {
      return res.json(errorResponse('数据库错误'));
    }
    
    // 获取分页数据
    db.all(
      `SELECT c.*, u.username, u.nickname, u.avatar 
       FROM contents c 
       LEFT JOIN users u ON c.userId = u.id 
       WHERE c.userId = ? 
       ORDER BY c.createTime DESC 
       LIMIT ? OFFSET ?`,
      [userId, limit, offset],
      (err, contents) => {
        if (err) {
          return res.json(errorResponse('数据库错误'));
        }
        
        const contentList = contents.map(content => {
          content.tags = content.tags ? JSON.parse(content.tags) : [];
          content.coverImage = content.coverImage ? JSON.parse(content.coverImage) : [];
          return content;
        });
        
        res.json(successResponse({
          list: contentList,
          total: countResult.total,
          page,
          limit
        }));
      }
    );
  });
});

// 查询所有内容（分页）
router.get('/', (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const offset = (page - 1) * limit;
  const contentType = req.query.contentType;
  
  let whereClause = '';
  let params = [];
  
  if (contentType) {
    whereClause = 'WHERE c.contentType = ?';
    params.push(contentType);
  }
  
  // 获取总数
  db.get(`SELECT COUNT(*) as total FROM contents c ${whereClause}`, params, (err, countResult) => {
    if (err) {
      return res.json(errorResponse('数据库错误'));
    }
    
    // 获取分页数据
    params.push(limit, offset);
    db.all(
      `SELECT c.*, u.username, u.nickname, u.avatar 
       FROM contents c 
       LEFT JOIN users u ON c.userId = u.id 
       ${whereClause}
       ORDER BY c.createTime DESC 
       LIMIT ? OFFSET ?`,
      params,
      (err, contents) => {
        if (err) {
          return res.json(errorResponse('数据库错误'));
        }
        
        const contentList = contents.map(content => {
          content.tags = content.tags ? JSON.parse(content.tags) : [];
          content.coverImage = content.coverImage ? JSON.parse(content.coverImage) : [];
          return content;
        });
        
        res.json(successResponse({
          list: contentList,
          total: countResult.total,
          page,
          limit
        }));
      }
    );
  });
});

// 修改内容
router.put('/:id', authMiddleware, (req, res) => {
  const { id } = req.params;
  const { title, description, contentType, tags, coverImage, content } = req.body;
  
  // 检查权限
  db.get('SELECT userId FROM contents WHERE id = ?', [id], (err, contentData) => {
    if (err) {
      return res.json(errorResponse('数据库错误'));
    }
    
    if (!contentData) {
      return res.json(errorResponse('内容不存在'));
    }
    
    if (contentData.userId !== req.user.id && req.user.role !== 'admin') {
      return res.json(errorResponse('无权限修改此内容', 403));
    }
    
    const tagsJson = tags ? JSON.stringify(tags) : null;
    const coverImageJson = coverImage ? JSON.stringify(coverImage) : null;
    
    db.run(
      'UPDATE contents SET title = ?, description = ?, contentType = ?, tags = ?, coverImage = ?, content = ?, updateTime = CURRENT_TIMESTAMP WHERE id = ?',
      [title, description, contentType, tagsJson, coverImageJson, content, id],
      function(err) {
        if (err) {
          return res.json(errorResponse('修改失败'));
        }
        
        res.json(successResponse(null, '修改成功'));
      }
    );
  });
});

// 删除内容
router.delete('/:id', authMiddleware, (req, res) => {
  const { id } = req.params;
  
  // 检查权限
  db.get('SELECT userId FROM contents WHERE id = ?', [id], (err, contentData) => {
    if (err) {
      return res.json(errorResponse('数据库错误'));
    }
    
    if (!contentData) {
      return res.json(errorResponse('内容不存在'));
    }
    
    if (contentData.userId !== req.user.id && req.user.role !== 'admin') {
      return res.json(errorResponse('无权限删除此内容', 403));
    }
    
    db.run('DELETE FROM contents WHERE id = ?', [id], function(err) {
      if (err) {
        return res.json(errorResponse('删除失败'));
      }
      
      res.json(successResponse(null, '删除成功'));
    });
  });
});

module.exports = router;
