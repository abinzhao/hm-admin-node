const { pool } = require('../config/database');

// 创建问答
async function createQuestion(questionData) {
  const { title, description, contentType, tags, coverImage, content } = questionData;
  const createTime = new Date().toISOString().slice(0, 19).replace('T', ' ');
  const updateTime = createTime;

  const [result] = await pool.execute(
    'INSERT INTO questions (title, description, contentType, tags, coverImage, content, createTime, updateTime) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
    [title, description, contentType, JSON.stringify(tags), JSON.stringify(coverImage), content, createTime, updateTime]
  );

  return { id: result.insertId };
}

// 获取所有问答
async function getAllQuestions() {
  const [rows] = await pool.execute('SELECT * FROM questions');
  return rows.map(row => ({
    ...row,
    tags: JSON.parse(row.tags || '[]'),
    coverImage: JSON.parse(row.coverImage || '[]')
  }));
}

// 根据ID获取问答
async function getQuestionById(id) {
  const [rows] = await pool.execute('SELECT * FROM questions WHERE id = ?', [id]);
  if (rows.length === 0) {
    return null;
  }
  const row = rows[0];
  return {
    ...row,
    tags: JSON.parse(row.tags || '[]'),
    coverImage: JSON.parse(row.coverImage || '[]')
  };
}

// 更新问答
async function updateQuestion(id, questionData) {
  const { title, description, tags, coverImage, content } = questionData;
  const updateTime = new Date().toISOString().slice(0, 19).replace('T', ' ');

  const [result] = await pool.execute(
    'UPDATE questions SET title = ?, description = ?, tags = ?, coverImage = ?, content = ?, updateTime = ? WHERE id = ?',
    [title, description, JSON.stringify(tags), JSON.stringify(coverImage), content, updateTime, id]
  );

  return result.affectedRows > 0;
}

// 删除问答
async function deleteQuestion(id) {
  const [result] = await pool.execute('DELETE FROM questions WHERE id = ?', [id]);
  return result.affectedRows > 0;
}

module.exports = {
  createQuestion,
  getAllQuestions,
  getQuestionById,
  updateQuestion,
  deleteQuestion
};