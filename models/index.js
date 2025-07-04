// models/index.js
// 模型聚合与数据库同步
const sequelize = require("../config/db");

const User = require("./user");
const Content = require("./content");
const Software = require("./software");
const Comment = require("./comment");
const Notification = require("./notification");
const Todo = require("./todo");
const OperationLog = require("./operationLog");
const ContentLike = require("./contentLike");
const ContentCollect = require("./contentCollect");

// 同步所有模型到数据库（开发环境可用 force: false）
async function syncDB() {
  await sequelize.sync({ alter: true });
  console.log("所有模型已同步到数据库");
}

module.exports = {
  sequelize,
  User,
  Content,
  Software,
  Comment,
  Notification,
  Todo,
  OperationLog,
  ContentLike,
  ContentCollect,
  syncDB,
};
