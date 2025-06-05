const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs-extra');

const DB_PATH = path.join(__dirname, '../HMOS-APP.db');

// 确保数据库目录存在
fs.ensureDirSync(path.dirname(DB_PATH));

const db = new Database(DB_PATH);

// 数据库操作包装器
const dbWrapper = {
  run: (sql, params = []) => {
    try {
      const stmt = db.prepare(sql);
      return stmt.run(params);
    } catch (error) {
      console.error('Database run error:', error);
      throw error;
    }
  },
  
  get: (sql, params = [], callback) => {
    try {
      const stmt = db.prepare(sql);
      const result = stmt.get(params);
      if (callback) callback(null, result);
      return result;
    } catch (error) {
      console.error('Database get error:', error);
      if (callback) callback(error);
      throw error;
    }
  },
  
  all: (sql, params = [], callback) => {
    try {
      const stmt = db.prepare(sql);
      const results = stmt.all(params);
      if (callback) callback(null, results);
      return results;
    } catch (error) {
      console.error('Database all error:', error);
      if (callback) callback(error);
      throw error;
    }
  }
};

// 初始化数据库
async function initDatabase() {
  try {
    console.log('正在初始化数据库...');
    
    // 创建用户表
    db.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        userId TEXT UNIQUE NOT NULL,
        username TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        nickname TEXT,
        role TEXT DEFAULT 'user',
        phone TEXT,
        tags TEXT,
        email TEXT,
        description TEXT,
        openId TEXT,
        avatar TEXT,
        createTime DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // 创建内容表
    db.exec(`
      CREATE TABLE IF NOT EXISTS contents (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        userId INTEGER NOT NULL,
        title TEXT NOT NULL,
        description TEXT,
        contentType TEXT NOT NULL,
        tags TEXT,
        coverImage TEXT,
        content TEXT,
        createTime DATETIME DEFAULT CURRENT_TIMESTAMP,
        updateTime DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (userId) REFERENCES users (id)
      )
    `);
    
    // 创建应用表
    db.exec(`
      CREATE TABLE IF NOT EXISTS apps (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        userId INTEGER NOT NULL,
        packageName TEXT UNIQUE NOT NULL,
        appName TEXT NOT NULL,
        description TEXT,
        appLogo TEXT,
        appDevType TEXT,
        updateInfo TEXT,
        appVersion TEXT,
        appSize TEXT,
        downloads INTEGER DEFAULT 0,
        appUrl TEXT,
        appType TEXT,
        appScreenshot TEXT,
        createTime DATETIME DEFAULT CURRENT_TIMESTAMP,
        updateTime DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (userId) REFERENCES users (id)
      )
    `);
    
    // 创建留言表
    db.exec(`
      CREATE TABLE IF NOT EXISTS messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        userId INTEGER NOT NULL,
        targetId INTEGER NOT NULL,
        targetType TEXT NOT NULL,
        content TEXT NOT NULL,
        createTime DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (userId) REFERENCES users (id)
      )
    `);
    
    // 创建通知表
    db.exec(`
      CREATE TABLE IF NOT EXISTS notifications (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        content TEXT NOT NULL,
        publisher TEXT NOT NULL,
        createTime DATETIME DEFAULT CURRENT_TIMESTAMP,
        updateTime DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // 创建代办事项表
    db.exec(`
      CREATE TABLE IF NOT EXISTS todos (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        userId INTEGER NOT NULL,
        title TEXT NOT NULL,
        description TEXT,
        status TEXT DEFAULT 'pending',
        priority TEXT DEFAULT 'medium',
        dueDate DATE,
        createTime DATETIME DEFAULT CURRENT_TIMESTAMP,
        updateTime DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (userId) REFERENCES users (id)
      )
    `);
    
    // 创建分类表
    db.exec(`
      CREATE TABLE IF NOT EXISTS categories (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        type TEXT NOT NULL,
        title TEXT NOT NULL,
        createTime DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // 创建日志表
    db.exec(`
      CREATE TABLE IF NOT EXISTS logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        level TEXT NOT NULL,
        message TEXT NOT NULL,
        meta TEXT,
        timestamp DATETIME NOT NULL,
        source TEXT DEFAULT 'system',
        createTime DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    console.log('数据库初始化成功');
  } catch (error) {
    console.error('数据库初始化失败:', error);
    throw error;
  }
}

module.exports = { db: dbWrapper, initDatabase };
