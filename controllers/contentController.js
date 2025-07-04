// controllers/contentController.js
// 内容相关控制器
const { Content, ContentLike, ContentCollect } = require("../models");
const { logOperation } = require("../utils/operationLog");
const fs = require("fs");
const path = require("path");

/**
 * 创建内容
 * @param {number} user_id 发布者ID
 * @param {string} type 内容类型（article, qa, code）
 * @param {string} title 标题
 * @param {string} content 正文/内容
 * @param {string} summary 摘要（可选）
 * @param {string} tags 标签（可选）
 * @param {string} category 分类（可选）
 * @param {string} main_image 主图（可选）
 * @param {string} language 编程语言（仅type=code时有值）
 * @Time O(1)
 * @Space O(1)
 */
exports.createContent = async (req, res) => {
  try {
    const { user_id, type, title, content, summary, tags, category, main_image, language } =
      req.body;
    // 防御性编程：参数校验
    if (!user_id || !type || !title || !content)
      return res.fail("user_id、type、title、content为必填项");
    // 创建内容
    const data = { user_id, type, title, content, summary, tags, category, main_image };
    if (type === "code") data.language = language;
    const item = await Content.create(data);
    await logOperation({
      user_id,
      action: "create",
      target_type: "content",
      target_id: item.id,
      detail: JSON.stringify(data),
    });
    res.success(item, "内容创建成功");
  } catch (err) {
    res.fail("内容创建失败");
  }
};

/**
 * 更新内容
 * @param {number} id 内容ID
 * @param {object} ... 其他可更新字段
 * @Time O(1)
 * @Space O(1)
 */
exports.updateContent = async (req, res) => {
  try {
    const { id, ...fields } = req.body;
    if (!id) return res.fail("缺少内容ID");
    const item = await Content.findByPk(id);
    if (!item) return res.fail("内容不存在");
    await item.update(fields);
    await logOperation({
      user_id: item.user_id,
      action: "update",
      target_type: "content",
      target_id: id,
      detail: JSON.stringify(fields),
    });
    res.success(item, "内容更新成功");
  } catch (err) {
    res.fail("内容更新失败");
  }
};

/**
 * 删除内容
 * @param {number} id 内容ID
 * @Time O(1)
 * @Space O(1)
 */
exports.deleteContent = async (req, res) => {
  try {
    const { id } = req.body;
    if (!id) return res.fail("缺少内容ID");
    const item = await Content.findByPk(id);
    if (!item) return res.fail("内容不存在");
    // 删除主图文件（如有）
    if (item.main_image) {
      const imgPath = path.join(__dirname, "../Files/images", path.basename(item.main_image));
      if (fs.existsSync(imgPath)) {
        fs.unlinkSync(imgPath);
      }
    }
    await logOperation({
      user_id: item.user_id,
      action: "delete",
      target_type: "content",
      target_id: id,
      detail: JSON.stringify(item),
    });
    await item.destroy(); // 硬删除
    res.success({}, "内容删除成功");
  } catch (err) {
    res.fail("内容删除失败");
  }
};

/**
 * 查询内容
 * 支持多条件查询：type、user_id、keyword、tag、category、id，支持分页和排序
 * @param {number} page 页码（可选，默认1）
 * @param {number} pageSize 每页数量（可选，默认10）
 * @param {string} order 排序方式（time/like/collect，默认time）
 * @Time O(n)
 * @Space O(n)
 */
exports.queryContent = async (req, res) => {
  try {
    const {
      type,
      user_id,
      keyword,
      tag,
      category,
      id,
      page = 1,
      pageSize = 10,
      order = "time",
    } = req.query;
    const where = { status: 0 };
    if (id) where.id = id;
    if (type) where.type = type;
    if (user_id) where.user_id = user_id;
    if (category) where.category = category;
    if (tag) where.tags = { $like: `%${tag}%` };
    if (keyword) {
      where.title = { $like: `%${keyword}%` };
    }
    // 分页参数
    const limit = parseInt(pageSize);
    const offset = (parseInt(page) - 1) * limit;
    // 排序参数
    let orderArr = [["created_at", "DESC"]];
    if (order === "like") orderArr = [["like_count", "DESC"]];
    if (order === "collect") orderArr = [["collect_count", "DESC"]];
    // 查询总数和分页数据
    const { count, rows } = await Content.findAndCountAll({
      where,
      limit,
      offset,
      order: orderArr,
    });
    res.success({ total: count, list: rows, page: parseInt(page), pageSize: limit }, "查询成功");
  } catch (err) {
    res.fail("查询失败");
  }
};

/**
 * 点赞/取消点赞内容
 * @param {number} user_id 用户ID
 * @param {number} content_id 内容ID
 * @param {boolean} like true点赞，false取消
 */
exports.likeContent = async (req, res) => {
  try {
    const { user_id, content_id, like } = req.body;
    if (!user_id || !content_id || typeof like !== "boolean")
      return res.fail("user_id、content_id、like为必填项");
    const content = await Content.findByPk(content_id);
    if (!content) return res.fail("内容不存在");
    if (like) {
      // 点赞
      const [record, created] = await ContentLike.findOrCreate({ where: { user_id, content_id } });
      if (created) {
        await content.increment("like_count");
        res.success({}, "点赞成功");
      } else {
        res.fail("已点赞");
      }
    } else {
      // 取消点赞
      const record = await ContentLike.findOne({ where: { user_id, content_id } });
      if (record) {
        await record.destroy();
        await content.decrement("like_count");
        res.success({}, "取消点赞成功");
      } else {
        res.fail("未点赞");
      }
    }
  } catch (err) {
    res.fail("操作失败");
  }
};

/**
 * 收藏/取消收藏内容
 * @param {number} user_id 用户ID
 * @param {number} content_id 内容ID
 * @param {boolean} collect true收藏，false取消
 */
exports.collectContent = async (req, res) => {
  try {
    const { user_id, content_id, collect } = req.body;
    if (!user_id || !content_id || typeof collect !== "boolean")
      return res.fail("user_id、content_id、collect为必填项");
    const content = await Content.findByPk(content_id);
    if (!content) return res.fail("内容不存在");
    if (collect) {
      // 收藏
      const [record, created] = await ContentCollect.findOrCreate({
        where: { user_id, content_id },
      });
      if (created) {
        await content.increment("collect_count");
        res.success({}, "收藏成功");
      } else {
        res.fail("已收藏");
      }
    } else {
      // 取消收藏
      const record = await ContentCollect.findOne({ where: { user_id, content_id } });
      if (record) {
        await record.destroy();
        await content.decrement("collect_count");
        res.success({}, "取消收藏成功");
      } else {
        res.fail("未收藏");
      }
    }
  } catch (err) {
    res.fail("操作失败");
  }
};

/**
 * 举报内容
 * @param {number} id 内容ID
 * @param {string} reason 举报理由
 */
exports.reportContent = async (req, res) => {
  try {
    const { id, reason } = req.body;
    if (!id || !reason) return res.fail("id、reason为必填项");
    const item = await Content.findByPk(id);
    if (!item) return res.fail("内容不存在");
    await item.update({ status: 2 });
    res.success({}, "举报成功");
  } catch (err) {
    res.fail("举报失败");
  }
};
