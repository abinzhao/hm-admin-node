// controllers/todoController.js
// 代办事项相关控制器
const { Todo } = require("../models");
const { logOperation } = require("../utils/operationLog");

/**
 * 新增代办事项
 * @param {number} user_id 所属用户ID
 * @param {string} title 标题
 * @param {string} description 详情（可选）
 * @param {string} status 状态（not_started, in_progress, completed）
 * @param {string} priority 优先级（low, medium, high, urgent）
 * @param {string} deadline 截止时间（可选）
 * @Time O(1)
 * @Space O(1)
 */
exports.createTodo = async (req, res) => {
  try {
    const { user_id, title, description, status, priority, deadline } = req.body;
    if (!user_id || !title) return res.fail("user_id、title为必填项");
    const todo = await Todo.create({ user_id, title, description, status, priority, deadline });
    res.success(todo, "代办事项创建成功");
  } catch (err) {
    res.fail("代办事项创建失败");
  }
};

/**
 * 编辑代办事项
 * @param {number} id 事项ID
 * @param {object} ... 其他可更新字段
 * @Time O(1)
 * @Space O(1)
 */
exports.updateTodo = async (req, res) => {
  try {
    const { id, ...fields } = req.body;
    if (!id) return res.fail("缺少事项ID");
    const todo = await Todo.findByPk(id);
    if (!todo) return res.fail("事项不存在");
    await todo.update(fields);
    res.success(todo, "代办事项更新成功");
  } catch (err) {
    res.fail("代办事项更新失败");
  }
};

/**
 * 删除代办事项（物理删除）
 * @param {number} id 事项ID
 * @Time O(1)
 * @Space O(1)
 */
exports.deleteTodo = async (req, res) => {
  try {
    const { id } = req.body;
    if (!id) return res.fail("缺少事项ID");
    const todo = await Todo.findByPk(id);
    if (!todo) return res.fail("事项不存在");
    await todo.destroy(); // 硬删除
    res.success({}, "代办事项删除成功");
  } catch (err) {
    res.fail("代办事项删除失败");
  }
};

/**
 * 查询代办事项
 * 支持按user_id、status、priority多条件查询，支持分页
 * @param {number} user_id 用户ID（可选）
 * @param {string} status 状态（可选）
 * @param {string} priority 优先级（可选）
 * @param {number} page 页码（可选，默认1）
 * @param {number} pageSize 每页数量（可选，默认10）
 * @Time O(n)
 * @Space O(n)
 */
exports.queryTodo = async (req, res) => {
  try {
    const { user_id, status, priority, page = 1, pageSize = 10 } = req.query;
    const where = { };
    if (user_id) where.user_id = user_id;
    if (status) where.status = status;
    if (priority) where.priority = priority;
    const limit = parseInt(pageSize);
    const offset = (parseInt(page) - 1) * limit;
    const { count, rows } = await Todo.findAndCountAll({ where, limit, offset });
    res.success({ total: count, list: rows, page: parseInt(page), pageSize: limit }, "查询成功");
  } catch (err) {
    res.fail("查询失败");
  }
};
