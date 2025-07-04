// models/operationLog.js
// 操作日志表模型
const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

const OperationLog = sequelize.define(
  "OperationLog",
  {
    id: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },
    user_id: { type: DataTypes.BIGINT, allowNull: true, comment: "操作用户ID" },
    action: { type: DataTypes.STRING(50), allowNull: false, comment: "操作类型" },
    target_type: { type: DataTypes.STRING(50), allowNull: false, comment: "操作对象类型" },
    target_id: { type: DataTypes.BIGINT, allowNull: false, comment: "操作对象ID" },
    detail: { type: DataTypes.TEXT, allowNull: true, comment: "操作详情" },
    created_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
  },
  {
    tableName: "operation_log",
    timestamps: false,
  }
);

module.exports = OperationLog;
