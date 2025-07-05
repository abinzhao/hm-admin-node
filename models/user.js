// models/user.js
// 用户表模型
const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

const User = sequelize.define(
  "User",
  {
    id: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },
    username: { type: DataTypes.STRING(50), allowNull: false, unique: true, comment: "用户名" },
    password: { type: DataTypes.STRING(255), allowNull: false, comment: "密码（加密）" },
    email: { type: DataTypes.STRING(100), allowNull: true, unique: true, comment: "邮箱" },
    phone: { type: DataTypes.STRING(20), allowNull: true, unique: true, comment: "手机号" },
    nickname: { type: DataTypes.STRING(50), allowNull: true, comment: "昵称" },
    avatar: { type: DataTypes.STRING(255), allowNull: true, comment: "头像URL" },
    bio: { type: DataTypes.STRING(255), allowNull: true, comment: "个人简介" },
    homepage: { type: DataTypes.STRING(255), allowNull: true, comment: "个人主页" },
    tags: { type: DataTypes.STRING(255), allowNull: true, comment: "用户标签（逗号分隔）" },
    role: { type: DataTypes.TINYINT, defaultValue: 0, comment: "角色（0普通，1管理员）" },
    status: { type: DataTypes.TINYINT, defaultValue: 0, comment: "状态（0正常，1禁用）" },
    huawei_unionid: { type: DataTypes.STRING(1000), allowNull: true, comment: "华为UnionID" },
    huawei_openid: { type: DataTypes.STRING(1000), allowNull: true, comment: "华为OpenID" },
    huawei_authorizationCode: { type: DataTypes.STRING(1000), allowNull: true, comment: "华为authorizationCode" },
    created_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
    updated_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
  },
  {
    tableName: "user",
    timestamps: false,
  }
);

module.exports = User;
