// models/content.js
// 内容表模型
const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

const Content = sequelize.define(
  "Content",
  {
    id: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },
    user_id: { type: DataTypes.BIGINT, allowNull: false, comment: "发布者ID" },
    type: { type: DataTypes.ENUM("article", "qa", "code"), allowNull: false, comment: "内容类型" },
    title: { type: DataTypes.STRING(200), allowNull: false, comment: "标题" },
    summary: { type: DataTypes.STRING(500), allowNull: true, comment: "摘要" },
    content: { type: DataTypes.TEXT, allowNull: false, comment: "正文/内容" },
    tags: { type: DataTypes.STRING(255), allowNull: true, comment: "标签（逗号分隔）" },
    category: { type: DataTypes.STRING(50), allowNull: true, comment: "分类" },
    main_image: { type: DataTypes.STRING(255), allowNull: true, comment: "主图URL" },
    language: {
      type: DataTypes.STRING(50),
      allowNull: true,
      comment: "编程语言（仅type=code时有值）",
    },
    like_count: { type: DataTypes.INTEGER, defaultValue: 0, comment: "点赞数" },
    collect_count: { type: DataTypes.INTEGER, defaultValue: 0, comment: "收藏数" },
    status: { type: DataTypes.TINYINT, defaultValue: 0, comment: "状态（0正常，1删除）" },
    created_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
    updated_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
  },
  {
    tableName: "content",
    timestamps: false,
  }
);

module.exports = Content;
