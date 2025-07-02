const { Todo, User } = require("../models");
const { Op } = require("sequelize");
const logger = require("../utils/logger");
const { sendResponse, sendError } = require("../utils/helpers");

/**
 * Todo待办事项控制器
 * 提供完整的待办事项管理功能
 */
class TodoController {
  /**
   * 创建待办事项
   * POST /api/todos
   */
  async createTodo(req, res) {
    try {
      const userId = req.user.id;
      const {
        title,
        description,
        priority = "medium",
        category,
        tags,
        due_date,
        reminder_at,
        estimated_hours,
        assignee_id,
        project_id,
        parent_id,
        is_public = false,
      } = req.body;

      // 验证必填字段
      if (!title || title.trim().length === 0) {
        return sendError(res, "待办事项标题不能为空", 400);
      }

      // 验证标题长度
      if (title.length > 200) {
        return sendError(res, "标题长度不能超过200个字符", 400);
      }

      // 验证优先级
      const validPriorities = ["low", "medium", "high", "urgent"];
      if (!validPriorities.includes(priority)) {
        return sendError(res, "无效的优先级", 400);
      }

      // 验证负责人是否存在
      if (assignee_id) {
        const assignee = await User.findByPk(assignee_id);
        if (!assignee) {
          return sendError(res, "指定的负责人不存在", 400);
        }
      }

      // 验证父任务是否存在
      if (parent_id) {
        const parentTodo = await Todo.findOne({
          where: {
            id: parent_id,
            [Op.or]: [{ creator_id: userId }, { assignee_id: userId }],
          },
        });
        if (!parentTodo) {
          return sendError(res, "父任务不存在或没有权限", 400);
        }
      }

      // 验证日期
      if (due_date && new Date(due_date) < new Date()) {
        return sendError(res, "截止日期不能早于当前时间", 400);
      }

      if (reminder_at && new Date(reminder_at) < new Date()) {
        return sendError(res, "提醒时间不能早于当前时间", 400);
      }

      // 创建待办事项
      const todoData = {
        title: title.trim(),
        description,
        priority,
        category,
        tags: Array.isArray(tags) ? tags : [],
        due_date: due_date ? new Date(due_date) : null,
        reminder_at: reminder_at ? new Date(reminder_at) : null,
        estimated_hours,
        creator_id: userId,
        assignee_id: assignee_id || userId,
        project_id,
        parent_id,
        is_public,
      };

      const todo = await Todo.create(todoData);

      // 获取完整的待办事项信息
      const fullTodo = await Todo.findByPk(todo.id, {
        include: [
          { model: User, as: "creator", attributes: ["id", "nickname", "avatar"] },
          { model: User, as: "assignee", attributes: ["id", "nickname", "avatar"] },
          { model: Todo, as: "parent", attributes: ["id", "title"] },
        ],
      });

      logger.info(`用户 ${userId} 创建了待办事项: ${title}`);

      sendResponse(
        res,
        {
          todo: fullTodo,
        },
        "待办事项创建成功",
        201
      );
    } catch (error) {
      logger.error("创建待办事项失败:", error);
      sendError(res, "创建待办事项失败");
    }
  }

  /**
   * 获取待办事项列表
   * GET /api/todos
   */
  async getTodos(req, res) {
    try {
      const userId = req.user.id;
      const {
        page = 1,
        limit = 20,
        status,
        priority,
        category,
        assignee_id,
        project_id,
        parent_id,
        search,
        sort_by = "created_at",
        sort_order = "DESC",
        include_completed = "false",
      } = req.query;

      // 构建查询条件
      const whereConditions = {
        [Op.or]: [{ creator_id: userId }, { assignee_id: userId }, { is_public: true }],
      };

      // 状态筛选
      if (status) {
        whereConditions.status = status;
      } else if (include_completed === "false") {
        whereConditions.status = { [Op.ne]: "completed" };
      }

      // 其他筛选条件
      if (priority) whereConditions.priority = priority;
      if (category) whereConditions.category = category;
      if (assignee_id) whereConditions.assignee_id = assignee_id;
      if (project_id) whereConditions.project_id = project_id;
      if (parent_id) whereConditions.parent_id = parent_id;

      // 搜索条件
      if (search) {
        whereConditions[Op.or] = [
          { title: { [Op.like]: `%${search}%` } },
          { description: { [Op.like]: `%${search}%` } },
        ];
      }

      // 排序设置
      const validSortFields = ["created_at", "updated_at", "due_date", "priority", "title"];
      const sortField = validSortFields.includes(sort_by) ? sort_by : "created_at";
      const sortDirection = sort_order.toUpperCase() === "ASC" ? "ASC" : "DESC";

      // 分页设置
      const pageNum = Math.max(1, parseInt(page));
      const pageSize = Math.min(100, Math.max(1, parseInt(limit)));
      const offset = (pageNum - 1) * pageSize;

      // 查询数据
      const { count, rows: todos } = await Todo.findAndCountAll({
        where: whereConditions,
        include: [
          { model: User, as: "creator", attributes: ["id", "nickname", "avatar"] },
          { model: User, as: "assignee", attributes: ["id", "nickname", "avatar"] },
          { model: Todo, as: "parent", attributes: ["id", "title"] },
          {
            model: Todo,
            as: "subtasks",
            attributes: ["id", "title", "status", "progress"],
            separate: true,
            limit: 5,
          },
        ],
        order: [[sortField, sortDirection]],
        limit: pageSize,
        offset: offset,
        distinct: true,
      });

      // 分页信息
      const pagination = {
        current_page: pageNum,
        total_pages: Math.ceil(count / pageSize),
        total_items: count,
        items_per_page: pageSize,
        has_next: pageNum < Math.ceil(count / pageSize),
        has_prev: pageNum > 1,
      };

      sendResponse(
        res,
        {
          todos,
          pagination,
        },
        "获取待办事项列表成功"
      );
    } catch (error) {
      logger.error("获取待办事项列表失败:", error);
      sendError(res, "获取待办事项列表失败");
    }
  }

  /**
   * 获取待办事项详情
   * GET /api/todos/:id
   */
  async getTodoById(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user.id;

      const todo = await Todo.findOne({
        where: {
          id,
          [Op.or]: [{ creator_id: userId }, { assignee_id: userId }, { is_public: true }],
        },
        include: [
          { model: User, as: "creator", attributes: ["id", "nickname", "avatar", "email"] },
          { model: User, as: "assignee", attributes: ["id", "nickname", "avatar", "email"] },
          { model: Todo, as: "parent", attributes: ["id", "title", "status"] },
          {
            model: Todo,
            as: "subtasks",
            include: [{ model: User, as: "assignee", attributes: ["id", "nickname", "avatar"] }],
          },
        ],
      });

      if (!todo) {
        return sendError(res, "待办事项不存在或没有权限查看", 404);
      }

      // 检查权限
      const canEdit =
        todo.creator_id === userId || todo.assignee_id === userId || req.user.role === "admin";

      const responseData = {
        ...todo.toJSON(),
        permissions: {
          can_edit: canEdit,
          can_delete: todo.creator_id === userId || req.user.role === "admin",
          can_assign: todo.creator_id === userId || req.user.role === "admin",
        },
      };

      sendResponse(res, { todo: responseData }, "获取待办事项详情成功");
    } catch (error) {
      logger.error("获取待办事项详情失败:", error);
      sendError(res, "获取待办事项详情失败");
    }
  }

  /**
   * 更新待办事项
   * PUT /api/todos/:id
   */
  async updateTodo(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user.id;
      const updateData = req.body;

      // 查找待办事项
      const todo = await Todo.findByPk(id);
      if (!todo) {
        return sendError(res, "待办事项不存在", 404);
      }

      // 权限检查
      const canEdit =
        todo.creator_id === userId || todo.assignee_id === userId || req.user.role === "admin";

      if (!canEdit) {
        return sendError(res, "没有权限编辑此待办事项", 403);
      }

      // 验证更新数据
      const allowedFields = [
        "title",
        "description",
        "status",
        "priority",
        "category",
        "tags",
        "due_date",
        "reminder_at",
        "progress",
        "estimated_hours",
        "actual_hours",
        "assignee_id",
        "notes",
        "is_public",
      ];

      const filteredData = {};
      for (const [key, value] of Object.entries(updateData)) {
        if (allowedFields.includes(key) && value !== undefined) {
          filteredData[key] = value;
        }
      }

      // 特定字段验证
      if (filteredData.title && filteredData.title.length > 200) {
        return sendError(res, "标题长度不能超过200个字符", 400);
      }

      if (
        filteredData.priority &&
        !["low", "medium", "high", "urgent"].includes(filteredData.priority)
      ) {
        return sendError(res, "无效的优先级", 400);
      }

      if (
        filteredData.status &&
        !["todo", "in_progress", "completed", "cancelled"].includes(filteredData.status)
      ) {
        return sendError(res, "无效的状态", 400);
      }

      if (filteredData.progress !== undefined) {
        const progress = parseInt(filteredData.progress);
        if (isNaN(progress) || progress < 0 || progress > 100) {
          return sendError(res, "进度值必须在0-100之间", 400);
        }
        filteredData.progress = progress;
      }

      // 验证负责人
      if (filteredData.assignee_id) {
        const assignee = await User.findByPk(filteredData.assignee_id);
        if (!assignee) {
          return sendError(res, "指定的负责人不存在", 400);
        }
      }

      // 重置提醒状态（如果修改了提醒时间）
      if (filteredData.reminder_at) {
        filteredData.is_reminded = false;
      }

      // 更新待办事项
      await todo.update(filteredData);

      // 获取更新后的完整信息
      const updatedTodo = await Todo.findByPk(id, {
        include: [
          { model: User, as: "creator", attributes: ["id", "nickname", "avatar"] },
          { model: User, as: "assignee", attributes: ["id", "nickname", "avatar"] },
          { model: Todo, as: "parent", attributes: ["id", "title"] },
        ],
      });

      logger.info(`用户 ${userId} 更新了待办事项 ${id}`);

      sendResponse(
        res,
        {
          todo: updatedTodo,
        },
        "待办事项更新成功"
      );
    } catch (error) {
      logger.error("更新待办事项失败:", error);
      sendError(res, "更新待办事项失败");
    }
  }

  /**
   * 删除待办事项
   * DELETE /api/todos/:id
   */
  async deleteTodo(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user.id;

      const todo = await Todo.findByPk(id);
      if (!todo) {
        return sendError(res, "待办事项不存在", 404);
      }

      // 权限检查
      const canDelete = todo.creator_id === userId || req.user.role === "admin";
      if (!canDelete) {
        return sendError(res, "没有权限删除此待办事项", 403);
      }

      // 检查是否有子任务
      const subtaskCount = await Todo.count({
        where: { parent_id: id },
      });

      if (subtaskCount > 0) {
        return sendError(res, "存在子任务，请先删除子任务", 400);
      }

      // 软删除
      await todo.destroy();

      logger.info(`用户 ${userId} 删除了待办事项 ${id}`);

      sendResponse(res, null, "待办事项删除成功");
    } catch (error) {
      logger.error("删除待办事项失败:", error);
      sendError(res, "删除待办事项失败");
    }
  }

  /**
   * 获取用户待办事项统计
   * GET /api/todos/stats
   */
  async getTodoStats(req, res) {
    try {
      const userId = req.user.id;
      const { period = "30" } = req.query;

      // 计算时间范围
      const days = parseInt(period);
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      // 基础统计
      const stats = await Todo.getStatsByUser(userId);

      // 趋势统计
      const trendStats = await Todo.findAll({
        where: {
          [Op.or]: [{ creator_id: userId }, { assignee_id: userId }],
          created_at: { [Op.gte]: startDate },
        },
        attributes: [
          [require("sequelize").fn("DATE", require("sequelize").col("created_at")), "date"],
          [require("sequelize").fn("COUNT", "*"), "count"],
        ],
        group: [require("sequelize").fn("DATE", require("sequelize").col("created_at"))],
        order: [[require("sequelize").fn("DATE", require("sequelize").col("created_at")), "ASC"]],
        raw: true,
      });

      // 分类统计
      const categoryStats = await Todo.findAll({
        where: {
          [Op.or]: [{ creator_id: userId }, { assignee_id: userId }],
        },
        attributes: ["category", [require("sequelize").fn("COUNT", "*"), "count"]],
        group: ["category"],
        order: [[require("sequelize").fn("COUNT", "*"), "DESC"]],
        raw: true,
      });

      // 优先级统计
      const priorityStats = await Todo.findAll({
        where: {
          [Op.or]: [{ creator_id: userId }, { assignee_id: userId }],
        },
        attributes: ["priority", [require("sequelize").fn("COUNT", "*"), "count"]],
        group: ["priority"],
        raw: true,
      });

      sendResponse(
        res,
        {
          overview: stats,
          trends: trendStats,
          categories: categoryStats,
          priorities: priorityStats,
        },
        "获取待办事项统计成功"
      );
    } catch (error) {
      logger.error("获取待办事项统计失败:", error);
      sendError(res, "获取待办事项统计失败");
    }
  }

  /**
   * 批量操作待办事项
   * POST /api/todos/batch
   */
  async batchOperation(req, res) {
    try {
      const userId = req.user.id;
      const { operation, todo_ids, data = {} } = req.body;

      if (!Array.isArray(todo_ids) || todo_ids.length === 0) {
        return sendError(res, "请选择要操作的待办事项", 400);
      }

      const validOperations = ["update_status", "update_priority", "assign", "delete"];
      if (!validOperations.includes(operation)) {
        return sendError(res, "无效的操作类型", 400);
      }

      // 验证权限
      const todos = await Todo.findAll({
        where: {
          id: { [Op.in]: todo_ids },
          [Op.or]: [{ creator_id: userId }, { assignee_id: userId }],
        },
      });

      if (todos.length !== todo_ids.length) {
        return sendError(res, "部分待办事项不存在或没有权限操作", 403);
      }

      let updateData = {};
      let result = [];

      switch (operation) {
        case "update_status":
          if (
            !data.status ||
            !["todo", "in_progress", "completed", "cancelled"].includes(data.status)
          ) {
            return sendError(res, "无效的状态值", 400);
          }
          updateData.status = data.status;
          if (data.status === "completed") {
            updateData.completed_at = new Date();
            updateData.progress = 100;
          }
          break;

        case "update_priority":
          if (!data.priority || !["low", "medium", "high", "urgent"].includes(data.priority)) {
            return sendError(res, "无效的优先级值", 400);
          }
          updateData.priority = data.priority;
          break;

        case "assign":
          if (!data.assignee_id) {
            return sendError(res, "请指定负责人", 400);
          }
          const assignee = await User.findByPk(data.assignee_id);
          if (!assignee) {
            return sendError(res, "指定的负责人不存在", 400);
          }
          updateData.assignee_id = data.assignee_id;
          break;

        case "delete":
          await Todo.destroy({
            where: { id: { [Op.in]: todo_ids } },
          });
          result = { deleted_count: todo_ids.length };
          break;
      }

      if (operation !== "delete") {
        const [updatedCount] = await Todo.update(updateData, {
          where: { id: { [Op.in]: todo_ids } },
        });
        result = { updated_count: updatedCount };
      }

      logger.info(`用户 ${userId} 批量操作待办事项: ${operation}, 数量: ${todo_ids.length}`);

      sendResponse(res, result, `批量${operation === "delete" ? "删除" : "更新"}成功`);
    } catch (error) {
      logger.error("批量操作待办事项失败:", error);
      sendError(res, "批量操作失败");
    }
  }

  /**
   * 获取待办事项子任务
   * GET /api/todos/:id/subtasks
   */
  async getSubtasks(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user.id;

      // 验证父任务权限
      const parentTodo = await Todo.findOne({
        where: {
          id,
          [Op.or]: [{ creator_id: userId }, { assignee_id: userId }, { is_public: true }],
        },
      });

      if (!parentTodo) {
        return sendError(res, "父任务不存在或没有权限查看", 404);
      }

      // 获取子任务
      const subtasks = await Todo.findAll({
        where: { parent_id: id },
        include: [
          { model: User, as: "creator", attributes: ["id", "nickname", "avatar"] },
          { model: User, as: "assignee", attributes: ["id", "nickname", "avatar"] },
        ],
        order: [
          ["order_index", "ASC"],
          ["created_at", "ASC"],
        ],
      });

      sendResponse(res, { subtasks }, "获取子任务列表成功");
    } catch (error) {
      logger.error("获取子任务列表失败:", error);
      sendError(res, "获取子任务列表失败");
    }
  }
}

module.exports = new TodoController();
