const articleModel = require('../models/article');
const questionModel = require('../models/question');
const codeSnippetModel = require('../models/codeSnippet');
const softwarePackageModel = require('../models/softwarePackage');
const logger = require('../utils/logger');

// 获取模型
function getModelByType(contentType) {
  switch (contentType) {
    case 'article':
      return articleModel;
    case 'question':
      return questionModel;
    case 'codeSnippet':
      return codeSnippetModel;
    case 'softwarePackage':
      return softwarePackageModel;
    default:
      throw new Error('不支持的内容类型');
  }
}

// 创建内容
async function createContent(contentType, contentData) {
  try {
    const model = getModelByType(contentType);
    const content = await model[`create${contentType.charAt(0).toUpperCase() + contentType.slice(1)}`](contentData);
    
    return {
      code: 201,
      message: `创建${contentType}成功`,
      data: content
    };
  } catch (error) {
    logger.error(`创建${contentType}失败:`, error);
    throw error;
  }
}

// 获取内容列表
async function getContents(contentType) {
  try {
    const model = getModelByType(contentType);
    const contents = await model[`getAll${contentType.charAt(0).toUpperCase() + contentType.slice(1)}s`]();
    
    return {
      code: 200,
      message: `获取${contentType}列表成功`,
      data: contents
    };
  } catch (error) {
    logger.error(`获取${contentType}列表失败:`, error);
    throw error;
  }
}

// 获取单个内容
async function getContentById(contentType, id) {
  try {
    const model = getModelByType(contentType);
    const content = await model[`get${contentType.charAt(0).toUpperCase() + contentType.slice(1)}ById`](id);
    
    if (!content) {
      return {
        code: 404,
        message: `${contentType}不存在`
      };
    }
    
    return {
      code: 200,
      message: `获取${contentType}成功`,
      data: content
    };
  } catch (error) {
    logger.error(`获取${contentType}失败:`, error);
    throw error;
  }
}

// 更新内容
async function updateContent(contentType, id, contentData) {
  try {
    const model = getModelByType(contentType);
    const isUpdated = await model[`update${contentType.charAt(0).toUpperCase() + contentType.slice(1)}`](id, contentData);
    
    if (!isUpdated) {
      return {
        code: 404,
        message: `${contentType}不存在`
      };
    }
    
    const updatedContent = await model[`get${contentType.charAt(0).toUpperCase() + contentType.slice(1)}ById`](id);
    
    return {
      code: 200,
      message: `更新${contentType}成功`,
      data: updatedContent
    };
  } catch (error) {
    logger.error(`更新${contentType}失败:`, error);
    throw error;
  }
}

// 删除内容
async function deleteContent(contentType, id) {
  try {
    const model = getModelByType(contentType);
    const isDeleted = await model[`delete${contentType.charAt(0).toUpperCase() + contentType.slice(1)}`](id);
    
    if (!isDeleted) {
      return {
        code: 404,
        message: `${contentType}不存在`
      };
    }
    
    return {
      code: 200,
      message: `删除${contentType}成功`
    };
  } catch (error) {
    logger.error(`删除${contentType}失败:`, error);
    throw error;
  }
}

// 增加软件包下载次数
async function incrementDownloads(id) {
  try {
    const isUpdated = await softwarePackageModel.incrementDownloads(id);
    
    if (!isUpdated) {
      return {
        code: 404,
        message: '软件包不存在'
      };
    }
    
    return {
      code: 200,
      message: '下载次数增加成功'
    };
  } catch (error) {
    logger.error('增加下载次数失败:', error);
    throw error;
  }
}

module.exports = {
  createContent,
  getContents,
  getContentById,
  updateContent,
  deleteContent,
  incrementDownloads
};