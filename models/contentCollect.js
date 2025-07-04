// models/contentCollect.js
// 内容收藏表模型
const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

const ContentCollect = sequelize.define(
  "ContentCollect",
  {
    id: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },
    user_id: { type: DataTypes.BIGINT, allowNull: false, comment: "用户ID" },
    content_id: { type: DataTypes.BIGINT, allowNull: false, comment: "内容ID" },
    created_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
  },
  {
    tableName: "content_collect",
    timestamps: false,
    indexes: [{ unique: true, fields: ["user_id", "content_id"] }],
  }
);

module.exports = ContentCollect;
