// utils/operationLog.js
// 操作日志工具
const { OperationLog } = require("../models");

/**
 * 记录操作日志
 * @param {object} param0 { user_id, action, target_type, target_id, detail }
 */
async function logOperation({ user_id, action, target_type, target_id, detail }) {
  try {
    await OperationLog.create({ user_id, action, target_type, target_id, detail });
  } catch (err) {
    // 日志记录失败不影响主流程
    console.error("操作日志记录失败", err);
  }
}

module.exports = { logOperation };
