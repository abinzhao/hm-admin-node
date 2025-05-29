const { pool } = require('../config/database');

// 创建文章
async function createArticle(articleData) {
  const { title, description, contentType, tags, coverImage, content } = articleData;
  const createTime = new Date().toISOString().slice(0, 19).replace('T', ' ');
  const updateTime = createTime;

  const [result] = await pool.execute(
    'INSERT INTO articles (title, description, contentType, tags, coverImage, content, createTime, updateTime) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
    [title, description, contentType, JSON.stringify(tags), JSON.stringify(coverImage), content, createTime, updateTime]
  );

  return { id: result.insertId };
}

// 获取所有文章
async function getAllArticles() {
  const [rows] = await pool.execute('SELECT * FROM articles');
  return rows.map(row => ({
    ...row,
    tags: JSON.parse(row.tags || '[]'),
    coverImage: JSON.parse(row.coverImage || '[]')
  }));
}

// 根据ID获取文章
async function getArticleById(id) {
  const [rows] = await pool.execute('SELECT * FROM articles WHERE id = ?', [id]);
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

// 更新文章
async function updateArticle(id, articleData) {
  const { title, description, tags, coverImage, content } = articleData;
  const updateTime = new Date().toISOString().slice(0, 19).replace('T', ' ');

  const [result] = await pool.execute(
    'UPDATE articles SET title = ?, description = ?, tags = ?, coverImage = ?, content = ?, updateTime = ? WHERE id = ?',
    [title, description, JSON.stringify(tags), JSON.stringify(coverImage), content, updateTime, id]
  );

  return result.affectedRows > 0;
}

// 删除文章
async function deleteArticle(id) {
  const [result] = await pool.execute('DELETE FROM articles WHERE id = ?', [id]);
  return result.affectedRows > 0;
}

module.exports = {
  createArticle,
  getAllArticles,
  getArticleById,
  updateArticle,
  deleteArticle
};