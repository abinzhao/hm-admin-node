// controllers/commentController.js
// 评论相关控制器
const { Comment } = require("../models");
const { logOperation } = require("../utils/operationLog");

/**
 * 发布评论
 * @param {number} content_id 所属内容ID/软件ID
 * @param {number} user_id 评论用户ID
 * @param {string} content 评论内容
 * @Time O(1)
 * @Space O(1)
 */
exports.createComment = async (req, res) => {
  try {
    const { content_id, user_id, content } = req.body;
    if (!content_id || !user_id || !content)
      return res.fail("content_id、user_id、content为必填项");
    const comment = await Comment.create({ content_id, user_id, content });
    await logOperation({
      user_id,
      action: "create",
      target_type: "comment",
      target_id: comment.id,
      detail: JSON.stringify({ content_id, content }),
    });
    res.success(comment, "评论发布成功");
  } catch (err) {
    res.fail("评论发布失败");
  }
};

/**
 * 删除评论
 * @param {number} id 评论ID
 * @Time O(1)
 * @Space O(1)
 */
exports.deleteComment = async (req, res) => {
  try {
    const { id } = req.body;
    if (!id) return res.fail("缺少评论ID");
    const comment = await Comment.findByPk(id);
    if (!comment) return res.fail("评论不存在");
    await logOperation({
      user_id: comment.user_id,
      action: "delete",
      target_type: "comment",
      target_id: id,
      detail: JSON.stringify(comment),
    });
    await comment.destroy(); // 硬删除
    res.success({}, "评论删除成功");
  } catch (err) {
    res.fail("评论删除失败");
  }
};

/**
 * 查询评论
 * 支持按内容ID/软件ID查询，支持分页
 * @param {number} content_id 内容ID/软件ID
 * @param {number} page 页码（可选，默认1）
 * @param {number} pageSize 每页数量（可选，默认10）
 * @Time O(n)
 * @Space O(n)
 */
exports.queryComment = async (req, res) => {
  try {
    const { content_id, page = 1, pageSize = 10 } = req.query;
    if (!content_id) return res.fail("缺少内容ID/软件ID");
    const limit = parseInt(pageSize);
    const offset = (parseInt(page) - 1) * limit;
    const { count, rows } = await Comment.findAndCountAll({
      where: { content_id, status: 0 },
      limit,
      offset,
    });
    res.success({ total: count, list: rows, page: parseInt(page), pageSize: limit }, "查询成功");
  } catch (err) {
    res.fail("查询失败");
  }
};

/**
 * 举报评论
 * @param {number} id 评论ID
 * @param {string} reason 举报理由
 */
exports.reportComment = async (req, res) => {
  try {
    const { id, reason } = req.body;
    if (!id || !reason) return res.fail("id、reason为必填项");
    const comment = await Comment.findByPk(id);
    if (!comment) return res.fail("评论不存在");
    await comment.update({ status: 2 });
    res.success({}, "举报成功");
  } catch (err) {
    res.fail("举报失败");
  }
};
