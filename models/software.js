// models/software.js
// 软件表模型
const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

const Software = sequelize.define(
  "Software",
  {
    id: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },
    user_id: { type: DataTypes.BIGINT, allowNull: false, comment: "发布者ID" },
    name: { type: DataTypes.STRING(100), allowNull: false, comment: "软件名称" },
    package_name: { type: DataTypes.STRING(100), allowNull: false, unique: true, comment: "包名" },
    icon: { type: DataTypes.STRING(255), allowNull: true, comment: "icon链接" },
    description: { type: DataTypes.STRING(500), allowNull: true, comment: "软件详情" },
    update_info: { type: DataTypes.STRING(500), allowNull: true, comment: "更新详情" },
    version: { type: DataTypes.STRING(50), allowNull: true, comment: "版本号" },
    download_url: { type: DataTypes.STRING(255), allowNull: true, comment: "软件下载链接" },
    download_count: { type: DataTypes.INTEGER, defaultValue: 0, comment: "下载次数" },
    tags: { type: DataTypes.STRING(255), allowNull: true, comment: "标签（逗号分隔）" },
    status: { type: DataTypes.TINYINT, defaultValue: 0, comment: "状态（0正常，1删除）" },
    created_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
    updated_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
  },
  {
    tableName: "software",
    timestamps: false,
  }
);

module.exports = Software;
