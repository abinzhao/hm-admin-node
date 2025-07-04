// controllers/notificationController.js
// 通知相关控制器
const { Notification } = require("../models");
const { logOperation } = require("../utils/operationLog");

/**
 * 发布通知
 * @param {number|null} user_id 接收用户ID（可为空，空为全量用户）
 * @param {string} type 通知类型（system, comment, reply）
 * @param {string} content 通知内容
 * @Time O(1)
 * @Space O(1)
 */
exports.createNotification = async (req, res) => {
  try {
    const { user_id, type, content } = req.body;
    if (!type || !content) return res.fail("type、content为必填项");
    const notification = await Notification.create({ user_id, type, content });
    await logOperation({
      user_id,
      action: "create",
      target_type: "notification",
      target_id: notification.id,
      detail: JSON.stringify({ type, content }),
    });
    res.success(notification, "通知发布成功");
  } catch (err) {
    res.fail("通知发布失败");
  }
};

/**
 * 编辑通知
 * @param {number} id 通知ID
 * @param {string} content 通知内容
 * @Time O(1)
 * @Space O(1)
 */
exports.updateNotification = async (req, res) => {
  try {
    const { id, content } = req.body;
    if (!id || !content) return res.fail("id、content为必填项");
    const notification = await Notification.findByPk(id);
    if (!notification) return res.fail("通知不存在");
    await notification.update({ content });
    await logOperation({
      user_id: notification.user_id,
      action: "update",
      target_type: "notification",
      target_id: id,
      detail: content,
    });
    res.success(notification, "通知更新成功");
  } catch (err) {
    res.fail("通知更新失败");
  }
};

/**
 * 删除通知（物理删除）
 * @param {number} id 通知ID
 * @Time O(1)
 * @Space O(1)
 */
exports.deleteNotification = async (req, res) => {
  try {
    const { id } = req.body;
    if (!id) return res.fail("缺少通知ID");
    const notification = await Notification.findByPk(id);
    if (!notification) return res.fail("通知不存在");
    await logOperation({
      user_id: notification.user_id,
      action: "delete",
      target_type: "notification",
      target_id: id,
      detail: JSON.stringify(notification),
    });
    await notification.destroy(); // 硬删除
    res.success({}, "通知删除成功");
  } catch (err) {
    res.fail("通知删除失败");
  }
};

/**
 * 查询通知
 * 支持按user_id查询，user_id为空查全量通知，支持分页
 * @param {number} user_id 用户ID（可选）
 * @param {number} page 页码（可选，默认1）
 * @param {number} pageSize 每页数量（可选，默认10）
 * @Time O(n)
 * @Space O(n)
 */
exports.queryNotification = async (req, res) => {
  try {
    const { user_id, page = 1, pageSize = 10 } = req.query;
    const where = { status: 0 };
    if (user_id) where.user_id = user_id;
    const limit = parseInt(pageSize);
    const offset = (parseInt(page) - 1) * limit;
    const { count, rows } = await Notification.findAndCountAll({ where, limit, offset });
    res.success({ total: count, list: rows, page: parseInt(page), pageSize: limit }, "查询成功");
  } catch (err) {
    res.fail("查询失败");
  }
};

/**
 * 标记通知为已读
 * @param {number} id 通知ID
 * @Time O(1)
 * @Space O(1)
 */
exports.markRead = async (req, res) => {
  try {
    const { id } = req.body;
    if (!id) return res.fail("缺少通知ID");
    const notification = await Notification.findByPk(id);
    if (!notification) return res.fail("通知不存在");
    await notification.update({ is_read: 1 });
    res.success({}, "通知已标记为已读");
  } catch (err) {
    res.fail("标记已读失败");
  }
};
