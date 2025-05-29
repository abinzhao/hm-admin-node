const announcementModel = require('../models/announcement');
const logger = require('../utils/logger');

// 获取所有公告
async function getAllAnnouncements() {
  try {
    const announcements = await announcementModel.getAllAnnouncements();
    
    return {
      code: 200,
      message: '获取公告列表成功',
      data: announcements
    };
  } catch (error) {
    logger.error('获取公告列表失败:', error);
    throw error;
  }
}

// 创建公告
async function createAnnouncement(announcementData) {
  try {
    const announcement = await announcementModel.createAnnouncement(announcementData);
    
    return {
      code: 201,
      message: '创建公告成功',
      data: announcement
    };
  } catch (error) {
    logger.error('创建公告失败:', error);
    throw error;
  }
}

// 获取单个公告
async function getAnnouncementById(id) {
  try {
    const announcement = await announcementModel.getAnnouncementById(id);
    
    if (!announcement) {
      return {
        code: 404,
        message: '公告不存在'
      };
    }
    
    return {
      code: 200,
      message: '获取公告成功',
      data: announcement
    };
  } catch (error) {
    logger.error('获取公告失败:', error);
    throw error;
  }
}

// 更新公告
async function updateAnnouncement(id, announcementData) {
  try {
    const isUpdated = await announcementModel.updateAnnouncement(id, announcementData);
    
    if (!isUpdated) {
      return {
        code: 404,
        message: '公告不存在'
      };
    }
    
    const updatedAnnouncement = await announcementModel.getAnnouncementById(id);
    
    return {
      code: 200,
      message: '更新公告成功',
      data: updatedAnnouncement
    };
  } catch (error) {
    logger.error('更新公告失败:', error);
    throw error;
  }
}

// 删除公告
async function deleteAnnouncement(id) {
  try {
    const isDeleted = await announcementModel.deleteAnnouncement(id);
    
    if (!isDeleted) {
      return {
        code: 404,
        message: '公告不存在'
      };
    }
    
    return {
      code: 200,
      message: '删除公告成功'
    };
  } catch (error) {
    logger.error('删除公告失败:', error);
    throw error;
  }
}

module.exports = {
  getAllAnnouncements,
  createAnnouncement,
  getAnnouncementById,
  updateAnnouncement,
  deleteAnnouncement
};