const express = require('express');
const router = express.Router();
const commentService = require('../../services/commentService');
const { authenticateToken } = require('../../middleware/auth');
const logger = require('../../utils/logger');

// 获取内容的所有留言
router.get('/:type/:contentId', async (req, res, next) => {
  try {
    const { type, contentId } = req.params;
    
    const result = await commentService.getCommentsByContent(type, contentId);
    res.status(result.code).json(result);
  } catch (error) {
    next(error);
  }
});

// 创建留言
router.post('/:type/:contentId', authenticateToken, async (req, res, next) => {
  try {
    const { type, contentId } = req.params;
    const commentData = { ...req.body, userId: req.user.id };
    
    const result = await commentService.createComment(type, contentId, commentData);
    res.status(result.code).json(result);
  } catch (error) {
    next(error);
  }
});

// 删除留言
router.delete('/:type/:contentId/:id', authenticateToken, async (req, res, next) => {
  try {
    const { id } = req.params;
    
    // 获取留言
    const commentResult = await commentService.getCommentById(id);
    if (!commentResult) {
      return res.status(404).json({
        code: 404,
        message: '留言不存在'
      });
    }
    
    // 检查权限：只有管理员或留言作者可以删除留言
    if (req.user.role !== 'admin' && commentResult.userId !== req.user.id) {
      return res.status(403).json({
        code: 403,
        message: '权限不足'
      });
    }
    
    const result = await commentService.deleteComment(id);
    res.status(result.code).json(result);
  } catch (error) {
    next(error);
  }
});

module.exports = router;