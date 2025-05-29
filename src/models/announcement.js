const { pool } = require('../config/database');

// 创建公告
async function createAnnouncement(announcementData) {
  const { title, content, publisherId } = announcementData;
  const createTime = new Date().toISOString().slice(0, 19).replace('T', ' ');
  const updateTime = createTime;

  const [result] = await pool.execute(
    'INSERT INTO announcements (title, content, publisherId, createTime, updateTime) VALUES (?, ?, ?, ?, ?)',
    [title, content, publisherId, createTime, updateTime]
  );

  return { id: result.insertId };
}

// 获取所有公告
async function getAllAnnouncements() {
  const [rows] = await pool.execute('SELECT * FROM announcements ORDER BY createTime DESC');
  return rows;
}

// 根据ID获取公告
async function getAnnouncementById(id) {
  const [rows] = await pool.execute('SELECT * FROM announcements WHERE id = ?', [id]);
  return rows[0];
}

// 更新公告
async function updateAnnouncement(id, announcementData) {
  const { title, content } = announcementData;
  const updateTime = new Date().toISOString().slice(0, 19).replace('T', ' ');

  const [result] = await pool.execute(
    'UPDATE announcements SET title = ?, content = ?, updateTime = ? WHERE id = ?',
    [title, content, updateTime, id]
  );

  return result.affectedRows > 0;
}

// 删除公告
async function deleteAnnouncement(id) {
  const [result] = await pool.execute('DELETE FROM announcements WHERE id = ?', [id]);
  return result.affectedRows > 0;
}

module.exports = {
  createAnnouncement,
  getAllAnnouncements,
  getAnnouncementById,
  updateAnnouncement,
  deleteAnnouncement
};