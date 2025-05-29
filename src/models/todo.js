const { pool } = require('../config/database');
const { v4: uuidv4 } = require('uuid');

// 创建代办事项
async function createTodo(userId, todoData) {
  const { title, description, status, priority, dueDate } = todoData;
  const id = uuidv4();

  const [result] = await pool.execute(
    'INSERT INTO todos (id, title, description, status, priority, dueDate) VALUES (?, ?, ?, ?, ?, ?)',
    [id, title, description, status, priority, dueDate]
  );

  return { id };
}

// 获取用户的所有代办事项
async function getTodosByUserId(userId) {
  const [rows] = await pool.execute('SELECT * FROM todos WHERE userId = ?', [userId]);
  return rows;
}

// 根据ID获取代办事项
async function getTodoById(id) {
  const [rows] = await pool.execute('SELECT * FROM todos WHERE id = ?', [id]);
  return rows[0];
}

// 更新代办事项
async function updateTodo(id, todoData) {
  const { title, description, status, priority, dueDate } = todoData;
  
  const [result] = await pool.execute(
    'UPDATE todos SET title = ?, description = ?, status = ?, priority = ?, dueDate = ? WHERE id = ?',
    [title, description, status, priority, dueDate, id]
  );

  return result.affectedRows > 0;
}

// 删除代办事项
async function deleteTodo(id) {
  const [result] = await pool.execute('DELETE FROM todos WHERE id = ?', [id]);
  return result.affectedRows > 0;
}

module.exports = {
  createTodo,
  getTodosByUserId,
  getTodoById,
  updateTodo,
  deleteTodo
};