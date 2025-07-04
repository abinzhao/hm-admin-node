// models/comment.js
// 评论表模型
const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

const Comment = sequelize.define(
  "Comment",
  {
    id: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },
    content_id: { type: DataTypes.BIGINT, allowNull: false, comment: "所属内容ID/软件ID" },
    user_id: { type: DataTypes.BIGINT, allowNull: false, comment: "评论用户ID" },
    content: { type: DataTypes.STRING(500), allowNull: false, comment: "评论内容" },
    status: { type: DataTypes.TINYINT, defaultValue: 0, comment: "状态（0正常，1删除，2举报）" },
    created_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
  },
  {
    tableName: "comment",
    timestamps: false,
  }
);

module.exports = Comment;
