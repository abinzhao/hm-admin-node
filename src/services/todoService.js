const todoModel = require('../models/todo');
const logger = require('../utils/logger');

// 获取用户的所有代办事项
async function getTodosByUserId(userId) {
  try {
    const todos = await todoModel.getTodosByUserId(userId);
    
    return {
      code: 200,
      message: '获取代办事项列表成功',
      data: todos
    };
  } catch (error) {
    logger.error('获取代办事项列表失败:', error);
    throw error;
  }
}

// 创建代办事项
async function createTodo(userId, todoData) {
  try {
    const todo = await todoModel.createTodo(userId, todoData);
    
    return {
      code: 201,
      message: '创建代办事项成功',
      data: todo
    };
  } catch (error) {
    logger.error('创建代办事项失败:', error);
    throw error;
  }
}

// 获取单个代办事项
async function getTodoById(id) {
  try {
    const todo = await todoModel.getTodoById(id);
    
    if (!todo) {
      return {
        code: 404,
        message: '代办事项不存在'
      };
    }
    
    return {
      code: 200,
      message: '获取代办事项成功',
      data: todo
    };
  } catch (error) {
    logger.error('获取代办事项失败:', error);
    throw error;
  }
}

// 更新代办事项
async function updateTodo(id, todoData) {
  try {
    const isUpdated = await todoModel.updateTodo(id, todoData);
    
    if (!isUpdated) {
      return {
        code: 404,
        message: '代办事项不存在'
      };
    }
    
    const updatedTodo = await todoModel.getTodoById(id);
    
    return {
      code: 200,
      message: '更新代办事项成功',
      data: updatedTodo
    };
  } catch (error) {
    logger.error('更新代办事项失败:', error);
    throw error;
  }
}

// 删除代办事项
async function deleteTodo(id) {
  try {
    const isDeleted = await todoModel.deleteTodo(id);
    
    if (!isDeleted) {
      return {
        code: 404,
        message: '代办事项不存在'
      };
    }
    
    return {
      code: 200,
      message: '删除代办事项成功'
    };
  } catch (error) {
    logger.error('删除代办事项失败:', error);
    throw error;
  }
}

module.exports = {
  getTodosByUserId,
  createTodo,
  getTodoById,
  updateTodo,
  deleteTodo
};