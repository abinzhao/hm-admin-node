const { pool } = require('../config/database');

// 创建代码片段
async function createCodeSnippet(snippetData) {
  const { title, description, contentType, tags, coverImage, content } = snippetData;
  const createTime = new Date().toISOString().slice(0, 19).replace('T', ' ');
  const updateTime = createTime;

  const [result] = await pool.execute(
    'INSERT INTO code_snippets (title, description, contentType, tags, coverImage, content, createTime, updateTime) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
    [title, description, contentType, JSON.stringify(tags), JSON.stringify(coverImage), content, createTime, updateTime]
  );

  return { id: result.insertId };
}

// 获取所有代码片段
async function getAllCodeSnippets() {
  const [rows] = await pool.execute('SELECT * FROM code_snippets');
  return rows.map(row => ({
    ...row,
    tags: JSON.parse(row.tags || '[]'),
    coverImage: JSON.parse(row.coverImage || '[]')
  }));
}

// 根据ID获取代码片段
async function getCodeSnippetById(id) {
  const [rows] = await pool.execute('SELECT * FROM code_snippets WHERE id = ?', [id]);
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

// 更新代码片段
async function updateCodeSnippet(id, snippetData) {
  const { title, description, tags, coverImage, content } = snippetData;
  const updateTime = new Date().toISOString().slice(0, 19).replace('T', ' ');

  const [result] = await pool.execute(
    'UPDATE code_snippets SET title = ?, description = ?, tags = ?, coverImage = ?, content = ?, updateTime = ? WHERE id = ?',
    [title, description, JSON.stringify(tags), JSON.stringify(coverImage), content, updateTime, id]
  );

  return result.affectedRows > 0;
}

// 删除代码片段
async function deleteCodeSnippet(id) {
  const [result] = await pool.execute('DELETE FROM code_snippets WHERE id = ?', [id]);
  return result.affectedRows > 0;
}

module.exports = {
  createCodeSnippet,
  getAllCodeSnippets,
  getCodeSnippetById,
  updateCodeSnippet,
  deleteCodeSnippet
};