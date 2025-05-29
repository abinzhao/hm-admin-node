const express = require('express');
const router = express.Router();
const contentService = require('../../services/contentService');
const { authenticateToken } = require('../../middleware/auth');
const logger = require('../../utils/logger');

// 创建内容
router.post('/:type', authenticateToken, async (req, res, next) => {
  try {
    const { type } = req.params;
    const contentData = { ...req.body, userId: req.user.id };
    
    const result = await contentService.createContent(type, contentData);
    res.status(result.code).json(result);
  } catch (error) {
    next(error);
  }
});

// 获取内容列表
router.get('/:type', async (req, res, next) => {
  try {
    const { type } = req.params;
    
    const result = await contentService.getContents(type);
    res.status(result.code).json(result);
  } catch (error) {
    next(error);
  }
});

// 获取单个内容
router.get('/:type/:id', async (req, res, next) => {
  try {
    const { type, id } = req.params;
    
    const result = await contentService.getContentById(type, id);
    res.status(result.code).json(result);
  } catch (error) {
    next(error);
  }
});

// 更新内容
router.put('/:type/:id', authenticateToken, async (req, res, next) => {
  try {
    const { type, id } = req.params;
    
    // 获取内容
    const contentResult = await contentService.getContentById(type, id);
    if (contentResult.code !== 200) {
      return res.status(contentResult.code).json(contentResult);
    }
    
    // 检查权限
    if (req.user.role !== 'admin' && contentResult.data.userId !== req.user.id) {
      return res.status(403).json({
        code: 403,
        message: '权限不足'
      });
    }
    
    const result = await contentService.updateContent(type, id, req.body);
    res.status(result.code).json(result);
  } catch (error) {
    next(error);
  }
});

// 删除内容
router.delete('/:type/:id', authenticateToken, async (req, res, next) => {
  try {
    const { type, id } = req.params;
    
    // 获取内容
    const contentResult = await contentService.getContentById(type, id);
    if (contentResult.code !== 200) {
      return res.status(contentResult.code).json(contentResult);
    }
    
    // 检查权限
    if (req.user.role !== 'admin' && contentResult.data.userId !== req.user.id) {
      return res.status(403).json({
        code: 403,
        message: '权限不足'
      });
    }
    
    const result = await contentService.deleteContent(type, id);
    res.status(result.code).json(result);
  } catch (error) {
    next(error);
  }
});

// 增加软件包下载次数
router.post('/softwarePackage/:id/download', async (req, res, next) => {
  try {
    const { id } = req.params;
    
    const result = await contentService.incrementDownloads(id);
    res.status(result.code).json(result);
  } catch (error) {
    next(error);
  }
});

module.exports = router;