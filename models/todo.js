// models/todo.js
// 代办事项表模型
const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

const Todo = sequelize.define(
  "Todo",
  {
    id: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },
    user_id: { type: DataTypes.BIGINT, allowNull: false, comment: "所属用户ID" },
    title: { type: DataTypes.STRING(100), allowNull: false, comment: "标题" },
    description: { type: DataTypes.STRING(255), allowNull: true, comment: "详情" },
    status: { type: DataTypes.TINYINT, defaultValue: 0, comment: "状态（0正常，1删除）" },
    priority: {
      type: DataTypes.ENUM("low", "medium", "high", "urgent"),
      defaultValue: "medium",
      comment: "优先级",
    },
    deadline: { type: DataTypes.DATE, allowNull: true, comment: "截止时间" },
    created_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
    updated_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
  },
  {
    tableName: "todo",
    timestamps: false,
  }
);

module.exports = Todo;
