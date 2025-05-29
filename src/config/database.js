const mysql = require('mysql2/promise');
const logger = require('../utils/logger');

// 从环境变量获取数据库配置
const config = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || 'password',
  database: process.env.DB_NAME || 'server_db',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
};

// 创建数据库连接池
const pool = mysql.createPool(config);

// 检查数据库和表是否存在，不存在则创建
async function initializeDatabase() {
  try {
    // 检查数据库是否存在
    const [databases] = await pool.execute('SHOW DATABASES LIKE ?', [config.database]);
    if (databases.length === 0) {
      await pool.execute(`CREATE DATABASE ${config.database}`);
      logger.info(`数据库 ${config.database} 创建成功`);
    }

    // 切换到指定数据库
    await pool.execute(`USE ${config.database}`);

    // 创建用户表
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS users (
        id VARCHAR(50) PRIMARY KEY,
        userId VARCHAR(50) UNIQUE NOT NULL,
        username VARCHAR(50) NOT NULL,
        passWord VARCHAR(100) NOT NULL,
        nickname VARCHAR(50),
        avatar TEXT,
        role VARCHAR(20) NOT NULL DEFAULT 'user',
        phone VARCHAR(20),
        email VARCHAR(50) UNIQUE,
        openId VARCHAR(50),
        createTime DATETIME NOT NULL
      )
    `);

    // 创建文章表
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS articles (
        id INT PRIMARY KEY AUTO_INCREMENT,
        title TEXT NOT NULL,
        description TEXT,
        contentType VARCHAR(20) NOT NULL,
        tags JSON,
        coverImage JSON,
        content LONGTEXT NOT NULL,
        createTime DATETIME NOT NULL,
        updateTime DATETIME NOT NULL
      )
    `);

    // 创建问答表
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS questions (
        id INT PRIMARY KEY AUTO_INCREMENT,
        title TEXT NOT NULL,
        description TEXT,
        contentType VARCHAR(20) NOT NULL,
        tags JSON,
        coverImage JSON,
        content LONGTEXT NOT NULL,
        createTime DATETIME NOT NULL,
        updateTime DATETIME NOT NULL
      )
    `);

    // 创建代码片段表
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS code_snippets (
        id INT PRIMARY KEY AUTO_INCREMENT,
        title TEXT NOT NULL,
        description TEXT,
        contentType VARCHAR(20) NOT NULL,
        tags JSON,
        coverImage JSON,
        content LONGTEXT NOT NULL,
        createTime DATETIME NOT NULL,
        updateTime DATETIME NOT NULL
      )
    `);

    // 创建软件包表
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS software_packages (
        id INT PRIMARY KEY AUTO_INCREMENT,
        packageName TEXT NOT NULL,
        appName TEXT NOT NULL,
        description TEXT,
        appLogo TEXT,
        appDevType VARCHAR(50),
        updateInfo TEXT,
        appVersion VARCHAR(20),
        appSize VARCHAR(20),
        downloads INT DEFAULT 0,
        appUrl TEXT NOT NULL,
        appType VARCHAR(50),
        appScreenshot JSON,
        createTime DATETIME NOT NULL,
        updateTime DATETIME NOT NULL
      )
    `);

    // 创建代办事项表
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS todos (
        id VARCHAR(50) PRIMARY KEY,
        title TEXT NOT NULL,
        description TEXT,
        status VARCHAR(20) NOT NULL,
        priority VARCHAR(20) NOT NULL,
        dueDate DATE
      )
    `);

    // 创建留言表
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS comments (
        id INT PRIMARY KEY AUTO_INCREMENT,
        userId INT NOT NULL,
        contentId INT NOT NULL,
        content TEXT NOT NULL,
        contentType VARCHAR(20) NOT NULL,
        createTime DATETIME NOT NULL
      )
    `);

    // 创建系统公告表
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS announcements (
        id INT PRIMARY KEY AUTO_INCREMENT,
        title TEXT NOT NULL,
        content LONGTEXT NOT NULL,
        publisherId VARCHAR(50) NOT NULL,
        createTime DATETIME NOT NULL,
        updateTime DATETIME NOT NULL
      )
    `);

    logger.info('数据库表结构检查完成');
  } catch (error) {
    logger.error('初始化数据库失败:', error);
    throw error;
  }
}

module.exports = {
  pool,
  initializeDatabase
};