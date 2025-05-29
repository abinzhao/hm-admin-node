const commentModel = require('../models/comment');
const logger = require('../utils/logger');

// 获取内容的所有留言
async function getCommentsByContent(contentType, contentId) {
  try {
    const comments = await commentModel.getCommentsByContent(contentType, contentId);
    
    return {
      code: 200,
      message: '获取留言列表成功',
      data: comments
    };
  } catch (error) {
    logger.error('获取留言列表失败:', error);
    throw error;
  }
}

// 创建留言
async function createComment(contentType, contentId, commentData) {
  try {
    const comment = await commentModel.createComment(contentType, contentId, commentData);
    
    return {
      code: 201,
      message: '创建留言成功',
      data: comment
    };
  } catch (error) {
    logger.error('创建留言失败:', error);
    throw error;
  }
}

// 删除留言
async function deleteComment(id) {
  try {
    const isDeleted = await commentModel.deleteComment(id);
    
    if (!isDeleted) {
      return {
        code: 404,
        message: '留言不存在'
      };
    }
    
    return {
      code: 200,
      message: '删除留言成功'
    };
  } catch (error) {
    logger.error('删除留言失败:', error);
    throw error;
  }
}

module.exports = {
  getCommentsByContent,
  createComment,
  deleteComment
};