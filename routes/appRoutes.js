const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs-extra');
const { db } = require('../config/database');
const { authMiddleware } = require('../middleware/auth');
const { successResponse, errorResponse } = require('../utils/response');

const router = express.Router();

// 配置文件上传
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = path.join(__dirname, '../resources/apps');
    fs.ensureDirSync(uploadPath);
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const uniqueName = Date.now() + '-' + Math.round(Math.random() * 1E9) + path.extname(file.originalname);
    cb(null, uniqueName);
  }
});

const upload = multer({ 
  storage,
  limits: { fileSize: 500 * 1024 * 1024 }, // 500MB
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['.hap', '.app', '.apk'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowedTypes.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('只允许上传.hap, .app, .apk格式的文件'));
    }
  }
});

// 新增应用
router.post('/', authMiddleware, upload.single('appFile'), (req, res) => {
  const { 
    packageName, appName, description, appLogo, appDevType, 
    updateInfo, appVersion, appSize, appType, appScreenshot 
  } = req.body;
  const userId = req.user.id;
  
  if (!packageName || !appName) {
    return res.json(errorResponse('包名和应用名不能为空'));
  }
  
  const appUrl = req.file ? `/resources/apps/${req.file.filename}` : null;
  const screenshotJson = appScreenshot ? JSON.stringify(JSON.parse(appScreenshot)) : null;
  
  db.run(
    `INSERT INTO apps (userId, packageName, appName, description, appLogo, appDevType, 
     updateInfo, appVersion, appSize, appUrl, appType, appScreenshot) 
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [userId, packageName, appName, description, appLogo, appDevType, 
     updateInfo, appVersion, appSize, appUrl, appType, screenshotJson],
    function(err) {
      if (err) {
        if (err.message.includes('UNIQUE constraint failed')) {
          return res.json(errorResponse('包名已存在'));
        }
        return res.json(errorResponse('创建应用失败'));
      }
      
      res.json(successResponse({ id: this.lastID }, '创建成功'));
    }
  );
});

// 查询单个应用
router.get('/:id', (req, res) => {
  const { id } = req.params;
  
  db.get(
    `SELECT a.*, u.username, u.nickname, u.avatar 
     FROM apps a 
     LEFT JOIN users u ON a.userId = u.id 
     WHERE a.id = ?`,
    [id],
    (err, app) => {
      if (err) {
        return res.json(errorResponse('数据库错误'));
      }
      
      if (!app) {
        return res.json(errorResponse('应用不存在'));
      }
      
      app.appScreenshot = app.appScreenshot ? JSON.parse(app.appScreenshot) : [];
      
      res.json(successResponse(app));
    }
  );
});

// 查询某个用户下的所有应用（分页）
router.get('/user/:userId', (req, res) => {
  const { userId } = req.params;
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const offset = (page - 1) * limit;
  
  // 获取总数
  db.get('SELECT COUNT(*) as total FROM apps WHERE userId = ?', [userId], (err, countResult) => {
    if (err) {
      return res.json(errorResponse('数据库错误'));
    }
    
    // 获取分页数据
    db.all(
      `SELECT a.*, u.username, u.nickname, u.avatar 
       FROM apps a 
       LEFT JOIN users u ON a.userId = u.id 
       WHERE a.userId = ? 
       ORDER BY a.createTime DESC 
       LIMIT ? OFFSET ?`,
      [userId, limit, offset],
      (err, apps) => {
        if (err) {
          return res.json(errorResponse('数据库错误'));
        }
        
        const appList = apps.map(app => {
          app.appScreenshot = app.appScreenshot ? JSON.parse(app.appScreenshot) : [];
          return app;
        });
        
        res.json(successResponse({
          list: appList,
          total: countResult.total,
          page,
          limit
        }));
      }
    );
  });
});

// 查询所有应用（分页）
router.get('/', (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const offset = (page - 1) * limit;
  const appType = req.query.appType;
  
  let whereClause = '';
  let params = [];
  
  if (appType) {
    whereClause = 'WHERE a.appType = ?';
    params.push(appType);
  }
  
  // 获取总数
  db.get(`SELECT COUNT(*) as total FROM apps a ${whereClause}`, params, (err, countResult) => {
    if (err) {
      return res.json(errorResponse('数据库错误'));
    }
    
    // 获取分页数据
    params.push(limit, offset);
    db.all(
      `SELECT a.*, u.username, u.nickname, u.avatar 
       FROM apps a 
       LEFT JOIN users u ON a.userId = u.id 
       ${whereClause}
       ORDER BY a.createTime DESC 
       LIMIT ? OFFSET ?`,
      params,
      (err, apps) => {
        if (err) {
          return res.json(errorResponse('数据库错误'));
        }
        
        const appList = apps.map(app => {
          app.appScreenshot = app.appScreenshot ? JSON.parse(app.appScreenshot) : [];
          return app;
        });
        
        res.json(successResponse({
          list: appList,
          total: countResult.total,
          page,
          limit
        }));
      }
    );
  });
});

// 修改应用
router.put('/:id', authMiddleware, upload.single('appFile'), (req, res) => {
  const { id } = req.params;
  const { 
    packageName, appName, description, appLogo, appDevType, 
    updateInfo, appVersion, appSize, appType, appScreenshot 
  } = req.body;
  
  // 检查权限
  db.get('SELECT * FROM apps WHERE id = ?', [id], (err, appData) => {
    if (err) {
      return res.json(errorResponse('数据库错误'));
    }
    
    if (!appData) {
      return res.json(errorResponse('应用不存在'));
    }
    
    if (appData.userId !== req.user.id && req.user.role !== 'admin') {
      return res.json(errorResponse('无权限修改此应用', 403));
    }
    
    let appUrl = appData.appUrl;
    
    // 如果上传了新的应用包
    if (req.file) {
      // 删除旧的应用包文件
      if (appData.appUrl) {
        const oldFilePath = path.join(__dirname, '..', appData.appUrl);
        fs.remove(oldFilePath).catch(console.error);
      }
      appUrl = `/resources/apps/${req.file.filename}`;
    }
    
    const screenshotJson = appScreenshot ? JSON.stringify(JSON.parse(appScreenshot)) : appData.appScreenshot;
    
    db.run(
      `UPDATE apps SET packageName = ?, appName = ?, description = ?, appLogo = ?, 
       appDevType = ?, updateInfo = ?, appVersion = ?, appSize = ?, appUrl = ?, 
       appType = ?, appScreenshot = ?, updateTime = CURRENT_TIMESTAMP WHERE id = ?`,
      [packageName, appName, description, appLogo, appDevType, updateInfo, 
       appVersion, appSize, appUrl, appType, screenshotJson, id],
      function(err) {
        if (err) {
          if (err.message.includes('UNIQUE constraint failed')) {
            return res.json(errorResponse('包名已存在'));
          }
          return res.json(errorResponse('修改失败'));
        }
        
        res.json(successResponse(null, '修改成功'));
      }
    );
  });
});

// 删除应用
router.delete('/:id', authMiddleware, (req, res) => {
  const { id } = req.params;
  
  // 检查权限
  db.get('SELECT * FROM apps WHERE id = ?', [id], (err, appData) => {
    if (err) {
      return res.json(errorResponse('数据库错误'));
    }
    
    if (!appData) {
      return res.json(errorResponse('应用不存在'));
    }
    
    if (appData.userId !== req.user.id && req.user.role !== 'admin') {
      return res.json(errorResponse('无权限删除此应用', 403));
    }
    
    db.run('DELETE FROM apps WHERE id = ?', [id], function(err) {
      if (err) {
        return res.json(errorResponse('删除失败'));
      }
      
      // 删除应用包文件
      if (appData.appUrl) {
        const filePath = path.join(__dirname, '..', appData.appUrl);
        fs.remove(filePath).catch(console.error);
      }
      
      res.json(successResponse(null, '删除成功'));
    });
  });
});

module.exports = router;
