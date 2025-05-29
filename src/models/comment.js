const { pool } = require('../config/database');

// 创建留言
async function createComment(contentType, contentId, commentData) {
  const { userId, content } = commentData;
  const createTime = new Date().toISOString().slice(0, 19).replace('T', ' ');

  const [result] = await pool.execute(
    'INSERT INTO comments (userId, contentId, content, contentType, createTime) VALUES (?, ?, ?, ?, ?)',
    [userId, contentId, content, contentType, createTime]
  );

  return { id: result.insertId };
}

// 获取内容的所有留言
async function getCommentsByContent(contentType, contentId) {
  const [rows] = await pool.execute(
    'SELECT comments.*, users.username, users.avatar FROM comments JOIN users ON comments.userId = users.id WHERE comments.contentType = ? AND comments.contentId = ? ORDER BY createTime DESC',
    [contentType, contentId]
  );
  return rows;
}

// 根据ID获取留言
async function getCommentById(id) {
  const [rows] = await pool.execute('SELECT * FROM comments WHERE id = ?', [id]);
  return rows[0];
}

// 删除留言
async function deleteComment(id) {
  const [result] = await pool.execute('DELETE FROM comments WHERE id = ?', [id]);
  return result.affectedRows > 0;
}

module.exports = {
  createComment,
  getCommentsByContent,
  getCommentById,
  deleteComment
};