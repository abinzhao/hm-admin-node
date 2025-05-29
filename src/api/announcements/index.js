const express = require('express');
const router = express.Router();
const announcementService = require('../../services/announcementService');
const { authenticateToken, authorizeAdmin } = require('../../middleware/auth');
const logger = require('../../utils/logger');

// 获取所有公告
router.get('/', async (req, res, next) => {
  try {
    const result = await announcementService.getAllAnnouncements();
    res.status(result.code).json(result);
  } catch (error) {
    next(error);
  }
});

// 创建公告（管理员）
router.post('/', authenticateToken, authorizeAdmin, async (req, res, next) => {
  try {
    const announcementData = { ...req.body, publisherId: req.user.id };
    const result = await announcementService.createAnnouncement(announcementData);
    res.status(result.code).json(result);
  } catch (error) {
    next(error);
  }
});

// 获取单个公告
router.get('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const result = await announcementService.getAnnouncementById(id);
    res.status(result.code).json(result);
  } catch (error) {
    next(error);
  }
});

// 更新公告（管理员）
router.put('/:id', authenticateToken, authorizeAdmin, async (req, res, next) => {
  try {
    const { id } = req.params;
    const result = await announcementService.updateAnnouncement(id, req.body);
    res.status(result.code).json(result);
  } catch (error) {
    next(error);
  }
});

// 删除公告（管理员）
router.delete('/:id', authenticateToken, authorizeAdmin, async (req, res, next) => {
  try {
    const { id } = req.params;
    const result = await announcementService.deleteAnnouncement(id);
    res.status(result.code).json(result);
  } catch (error) {
    next(error);
  }
});

module.exports = router;