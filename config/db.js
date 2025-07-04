// config/db.js
// 数据库连接配置
const { Sequelize } = require("sequelize");
const dotenv = require("dotenv");
dotenv.config();

// 从环境变量读取数据库配置
const sequelize = new Sequelize(process.env.DB_NAME, process.env.DB_USER, process.env.DB_PASS, {
  host: process.env.DB_HOST,
  port: process.env.DB_PORT || 3306,
  dialect: "mysql",
  logging: false, // 关闭SQL日志
});

module.exports = sequelize;
