const { pool } = require('../config/database');

// 创建软件包
async function createSoftwarePackage(packageData) {
  const { 
    packageName, appName, description, appLogo, appDevType, 
    updateInfo, appVersion, appSize, appUrl, appType, appScreenshot 
  } = packageData;
  const createTime = new Date().toISOString().slice(0, 19).replace('T', ' ');
  const updateTime = createTime;

  const [result] = await pool.execute(
    'INSERT INTO software_packages (packageName, appName, description, appLogo, appDevType, updateInfo, appVersion, appSize, appUrl, appType, appScreenshot, createTime, updateTime) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
    [packageName, appName, description, appLogo, appDevType, updateInfo, appVersion, appSize, appUrl, appType, JSON.stringify(appScreenshot), createTime, updateTime]
  );

  return { id: result.insertId };
}

// 获取所有软件包
async function getAllSoftwarePackages() {
  const [rows] = await pool.execute('SELECT * FROM software_packages');
  return rows.map(row => ({
    ...row,
    appScreenshot: JSON.parse(row.appScreenshot || '[]')
  }));
}

// 根据ID获取软件包
async function getSoftwarePackageById(id) {
  const [rows] = await pool.execute('SELECT * FROM software_packages WHERE id = ?', [id]);
  if (rows.length === 0) {
    return null;
  }
  const row = rows[0];
  return {
    ...row,
    appScreenshot: JSON.parse(row.appScreenshot || '[]')
  };
}

// 更新软件包
async function updateSoftwarePackage(id, packageData) {
  const { 
    packageName, appName, description, appLogo, appDevType, 
    updateInfo, appVersion, appSize, appUrl, appType, appScreenshot 
  } = packageData;
  const updateTime = new Date().toISOString().slice(0, 19).replace('T', ' ');

  const [result] = await pool.execute(
    'UPDATE software_packages SET packageName = ?, appName = ?, description = ?, appLogo = ?, appDevType = ?, updateInfo = ?, appVersion = ?, appSize = ?, appUrl = ?, appType = ?, appScreenshot = ?, updateTime = ? WHERE id = ?',
    [packageName, appName, description, appLogo, appDevType, updateInfo, appVersion, appSize, appUrl, appType, JSON.stringify(appScreenshot), updateTime, id]
  );

  return result.affectedRows > 0;
}

// 删除软件包
async function deleteSoftwarePackage(id) {
  const [result] = await pool.execute('DELETE FROM software_packages WHERE id = ?', [id]);
  return result.affectedRows > 0;
}

// 增加下载次数
async function incrementDownloads(id) {
  const [result] = await pool.execute(
    'UPDATE software_packages SET downloads = downloads + 1 WHERE id = ?',
    [id]
  );
  return result.affectedRows > 0;
}

module.exports = {
  createSoftwarePackage,
  getAllSoftwarePackages,
  getSoftwarePackageById,
  updateSoftwarePackage,
  deleteSoftwarePackage,
  incrementDownloads
};