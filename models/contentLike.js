// models/contentLike.js
// 内容点赞表模型
const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

const ContentLike = sequelize.define(
  "ContentLike",
  {
    id: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },
    user_id: { type: DataTypes.BIGINT, allowNull: false, comment: "用户ID" },
    content_id: { type: DataTypes.BIGINT, allowNull: false, comment: "内容ID" },
    created_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
  },
  {
    tableName: "content_like",
    timestamps: false,
    indexes: [{ unique: true, fields: ["user_id", "content_id"] }],
  }
);

module.exports = ContentLike;
