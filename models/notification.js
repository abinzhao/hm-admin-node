// models/notification.js
// 通知表模型
const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

const Notification = sequelize.define(
  "Notification",
  {
    id: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },
    user_id: {
      type: DataTypes.BIGINT,
      allowNull: true,
      comment: "接收用户ID（可为空，空为全量用户）",
    },
    type: {
      type: DataTypes.ENUM("system", "comment", "reply"),
      allowNull: false,
      comment: "通知类型",
    },
    content: { type: DataTypes.STRING(255), allowNull: false, comment: "通知内容" },
    is_read: { type: DataTypes.TINYINT, defaultValue: 0, comment: "是否已读（0未读，1已读）" },
    status: { type: DataTypes.TINYINT, defaultValue: 0, comment: "状态（0正常，1删除）" },
    created_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
  },
  {
    tableName: "notification",
    timestamps: false,
  }
);

module.exports = Notification;
