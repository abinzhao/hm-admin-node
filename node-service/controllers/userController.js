const {
  User,
  Content,
  Comment,
  Like,
  Favorite,
  UserFollow,
  Todo,
  FileUpload,
} = require("../models");
const { Op } = require("sequelize");
const logger = require("../utils/logger");
const { sendResponse, sendError } = require("../utils/helpers");
const bcrypt = require("bcryptjs");

/**
 * 用户管理控制器
 * 提供用户CRUD、状态管理、统计等功能
 */
class UserController {
  /**
   * 获取用户列表 (管理员)
   * GET /api/users
   */
  async getUsers(req, res) {
    try {
      const {
        page = 1,
        limit = 20,
        role,
        status,
        level,
        search,
        sort_by = "created_at",
        sort_order = "DESC",
      } = req.query;

      // 构建查询条件
      const whereConditions = {};

      if (role) {
        whereConditions.role = role;
      }

      if (status) {
        whereConditions.status = status;
      }

      if (level !== undefined) {
        whereConditions.level = parseInt(level);
      }

      if (search) {
        whereConditions[Op.or] = [
          { username: { [Op.like]: `%${search}%` } },
          { nickname: { [Op.like]: `%${search}%` } },
          { email: { [Op.like]: `%${search}%` } },
        ];
      }

      // 排序设置
      const validSortFields = [
        "created_at",
        "updated_at",
        "username",
        "nickname",
        "level",
        "login_count",
      ];
      const sortField = validSortFields.includes(sort_by) ? sort_by : "created_at";
      const sortDirection = sort_order.toUpperCase() === "ASC" ? "ASC" : "DESC";

      // 分页设置
      const pageNum = Math.max(1, parseInt(page));
      const pageSize = Math.min(100, Math.max(1, parseInt(limit)));
      const offset = (pageNum - 1) * pageSize;

      // 查询数据
      const { count, rows: users } = await User.findAndCountAll({
        where: whereConditions,
        attributes: { exclude: ["password"] },
        order: [[sortField, sortDirection]],
        limit: pageSize,
        offset: offset,
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
          users,
          pagination,
        },
        "获取用户列表成功"
      );
    } catch (error) {
      logger.error("获取用户列表失败:", error);
      sendError(res, "获取用户列表失败");
    }
  }

  /**
   * 获取用户详情
   * GET /api/users/:id
   */
  async getUserById(req, res) {
    try {
      const { id } = req.params;
      const currentUserId = req.user.id;
      const isAdmin = req.user.role === "admin";

      const user = await User.findByPk(id, {
        attributes: { exclude: ["password"] },
        include: [
          {
            model: UserFollow,
            as: "followersRelation",
            attributes: ["follower_id"],
            separate: true,
            limit: 100,
          },
          {
            model: UserFollow,
            as: "followingRelation",
            attributes: ["following_id"],
            separate: true,
            limit: 100,
          },
        ],
      });

      if (!user) {
        return sendError(res, "用户不存在", 404);
      }

      // 获取用户统计信息
      const [
        contentCount,
        commentCount,
        likeCount,
        favoriteCount,
        followerCount,
        followingCount,
        todoCount,
      ] = await Promise.all([
        Content.count({ where: { user_id: id } }),
        Comment.count({ where: { user_id: id } }),
        Like.count({ where: { user_id: id } }),
        Favorite.count({ where: { user_id: id } }),
        UserFollow.count({ where: { following_id: id } }),
        UserFollow.count({ where: { follower_id: id } }),
        Todo ? Todo.count({ where: { creator_id: id } }) : 0,
      ]);

      // 检查当前用户是否关注了此用户
      let isFollowing = false;
      if (currentUserId && currentUserId !== parseInt(id)) {
        const followRelation = await UserFollow.findOne({
          where: {
            follower_id: currentUserId,
            following_id: id,
          },
        });
        isFollowing = !!followRelation;
      }

      // 权限检查
      const canEdit = currentUserId === parseInt(id) || isAdmin;
      const canChangeStatus = isAdmin;
      const canChangeRole = isAdmin;

      const responseData = {
        ...user.toJSON(),
        stats: {
          content_count: contentCount,
          comment_count: commentCount,
          like_count: likeCount,
          favorite_count: favoriteCount,
          follower_count: followerCount,
          following_count: followingCount,
          todo_count: todoCount,
        },
        permissions: {
          can_edit: canEdit,
          can_change_status: canChangeStatus,
          can_change_role: canChangeRole,
          can_follow: currentUserId !== parseInt(id),
        },
        is_following: isFollowing,
      };

      sendResponse(res, { user: responseData }, "获取用户详情成功");
    } catch (error) {
      logger.error("获取用户详情失败:", error);
      sendError(res, "获取用户详情失败");
    }
  }

  /**
   * 更新用户信息
   * PUT /api/users/:id
   */
  async updateUser(req, res) {
    try {
      const { id } = req.params;
      const currentUserId = req.user.id;
      const isAdmin = req.user.role === "admin";
      const updateData = req.body;

      // 查找用户
      const user = await User.findByPk(id);
      if (!user) {
        return sendError(res, "用户不存在", 404);
      }

      // 权限检查
      const canEdit = currentUserId === parseInt(id) || isAdmin;
      if (!canEdit) {
        return sendError(res, "没有权限编辑此用户", 403);
      }

      // 过滤允许更新的字段
      const userEditableFields = ["nickname", "bio", "location", "website", "github", "avatar"];
      const adminOnlyFields = ["username", "email", "role", "status", "level", "email_verified"];

      const allowedFields = isAdmin
        ? [...userEditableFields, ...adminOnlyFields]
        : userEditableFields;

      const filteredData = {};
      for (const [key, value] of Object.entries(updateData)) {
        if (allowedFields.includes(key) && value !== undefined) {
          filteredData[key] = value;
        }
      }

      // 特殊字段验证
      if (filteredData.username) {
        // 检查用户名是否已存在
        const existingUser = await User.findOne({
          where: {
            username: filteredData.username,
            id: { [Op.ne]: id },
          },
        });
        if (existingUser) {
          return sendError(res, "用户名已存在", 400);
        }
      }

      if (filteredData.email) {
        // 检查邮箱是否已存在
        const existingUser = await User.findOne({
          where: {
            email: filteredData.email,
            id: { [Op.ne]: id },
          },
        });
        if (existingUser) {
          return sendError(res, "邮箱已存在", 400);
        }
      }

      if (filteredData.role && !["user", "auditor", "admin"].includes(filteredData.role)) {
        return sendError(res, "无效的角色", 400);
      }

      if (filteredData.status && !["active", "inactive", "banned"].includes(filteredData.status)) {
        return sendError(res, "无效的状态", 400);
      }

      if (filteredData.level !== undefined) {
        const level = parseInt(filteredData.level);
        if (isNaN(level) || level < 0 || level > 100) {
          return sendError(res, "用户等级必须在0-100之间", 400);
        }
        filteredData.level = level;
      }

      // 更新用户
      await user.update(filteredData);

      // 获取更新后的用户信息（不包含密码）
      const updatedUser = await User.findByPk(id, {
        attributes: { exclude: ["password"] },
      });

      logger.info(`用户 ${currentUserId} 更新了用户 ${id} 的信息`);

      sendResponse(res, { user: updatedUser }, "用户信息更新成功");
    } catch (error) {
      logger.error("更新用户信息失败:", error);
      sendError(res, "更新用户信息失败");
    }
  }

  /**
   * 删除用户 (管理员)
   * DELETE /api/users/:id
   */
  async deleteUser(req, res) {
    try {
      const { id } = req.params;
      const currentUserId = req.user.id;

      if (currentUserId === parseInt(id)) {
        return sendError(res, "不能删除自己", 400);
      }

      const user = await User.findByPk(id);
      if (!user) {
        return sendError(res, "用户不存在", 404);
      }

      // 软删除用户
      await user.destroy();

      logger.info(`管理员 ${currentUserId} 删除了用户 ${id}`);

      sendResponse(res, null, "用户删除成功");
    } catch (error) {
      logger.error("删除用户失败:", error);
      sendError(res, "删除用户失败");
    }
  }

  /**
   * 修改密码
   * PUT /api/users/:id/password
   */
  async changePassword(req, res) {
    try {
      const { id } = req.params;
      const currentUserId = req.user.id;
      const isAdmin = req.user.role === "admin";
      const { current_password, new_password } = req.body;

      // 权限检查
      if (currentUserId !== parseInt(id) && !isAdmin) {
        return sendError(res, "没有权限修改此用户密码", 403);
      }

      if (!new_password || new_password.length < 6) {
        return sendError(res, "新密码长度至少6位", 400);
      }

      const user = await User.findByPk(id);
      if (!user) {
        return sendError(res, "用户不存在", 404);
      }

      // 如果是用户自己修改密码，需要验证当前密码
      if (currentUserId === parseInt(id)) {
        if (!current_password) {
          return sendError(res, "请输入当前密码", 400);
        }

        const isCurrentPasswordValid = await bcrypt.compare(current_password, user.password);
        if (!isCurrentPasswordValid) {
          return sendError(res, "当前密码错误", 400);
        }
      }

      // 加密新密码
      const hashedPassword = await bcrypt.hash(new_password, 12);

      // 更新密码
      await user.update({
        password: hashedPassword,
        password_changed_at: new Date(),
      });

      logger.info(`用户 ${id} 的密码已更新`);

      sendResponse(res, null, "密码修改成功");
    } catch (error) {
      logger.error("修改密码失败:", error);
      sendError(res, "修改密码失败");
    }
  }

  /**
   * 获取用户统计信息
   * GET /api/users/stats
   */
  async getUserStats(req, res) {
    try {
      const [
        totalUsers,
        activeUsers,
        newUsersToday,
        newUsersThisMonth,
        usersByRole,
        usersByStatus,
        usersByLevel,
      ] = await Promise.all([
        User.count(),
        User.count({ where: { status: "active" } }),
        User.count({
          where: {
            created_at: {
              [Op.gte]: new Date(new Date().setHours(0, 0, 0, 0)),
            },
          },
        }),
        User.count({
          where: {
            created_at: {
              [Op.gte]: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
            },
          },
        }),
        User.findAll({
          attributes: ["role", [require("sequelize").fn("COUNT", "*"), "count"]],
          group: ["role"],
          raw: true,
        }),
        User.findAll({
          attributes: ["status", [require("sequelize").fn("COUNT", "*"), "count"]],
          group: ["status"],
          raw: true,
        }),
        User.findAll({
          attributes: ["level", [require("sequelize").fn("COUNT", "*"), "count"]],
          group: ["level"],
          order: [["level", "ASC"]],
          raw: true,
        }),
      ]);

      sendResponse(
        res,
        {
          overview: {
            total_users: totalUsers,
            active_users: activeUsers,
            new_users_today: newUsersToday,
            new_users_this_month: newUsersThisMonth,
          },
          by_role: usersByRole,
          by_status: usersByStatus,
          by_level: usersByLevel,
        },
        "获取用户统计成功"
      );
    } catch (error) {
      logger.error("获取用户统计失败:", error);
      sendError(res, "获取用户统计失败");
    }
  }

  /**
   * 批量操作用户 (管理员)
   * POST /api/users/batch
   */
  async batchOperation(req, res) {
    try {
      const { operation, user_ids, data = {} } = req.body;

      if (!Array.isArray(user_ids) || user_ids.length === 0) {
        return sendError(res, "请选择要操作的用户", 400);
      }

      const validOperations = ["update_status", "update_role", "update_level", "delete"];
      if (!validOperations.includes(operation)) {
        return sendError(res, "无效的操作类型", 400);
      }

      // 不能对自己进行操作
      const currentUserId = req.user.id;
      if (user_ids.includes(currentUserId)) {
        return sendError(res, "不能对自己进行批量操作", 400);
      }

      // 查找用户
      const users = await User.findAll({
        where: { id: { [Op.in]: user_ids } },
      });

      if (users.length !== user_ids.length) {
        return sendError(res, "部分用户不存在", 400);
      }

      let updateData = {};
      let result = {};

      switch (operation) {
        case "update_status":
          if (!data.status || !["active", "inactive", "banned"].includes(data.status)) {
            return sendError(res, "无效的状态值", 400);
          }
          updateData.status = data.status;
          break;

        case "update_role":
          if (!data.role || !["user", "auditor", "admin"].includes(data.role)) {
            return sendError(res, "无效的角色值", 400);
          }
          updateData.role = data.role;
          break;

        case "update_level":
          const level = parseInt(data.level);
          if (isNaN(level) || level < 0 || level > 100) {
            return sendError(res, "用户等级必须在0-100之间", 400);
          }
          updateData.level = level;
          break;

        case "delete":
          await User.destroy({
            where: { id: { [Op.in]: user_ids } },
          });
          result = { deleted_count: user_ids.length };
          break;
      }

      if (operation !== "delete") {
        const [updatedCount] = await User.update(updateData, {
          where: { id: { [Op.in]: user_ids } },
        });
        result = { updated_count: updatedCount };
      }

      logger.info(`管理员 ${currentUserId} 批量操作用户: ${operation}, 数量: ${user_ids.length}`);

      sendResponse(res, result, `批量${operation === "delete" ? "删除" : "更新"}成功`);
    } catch (error) {
      logger.error("批量操作用户失败:", error);
      sendError(res, "批量操作失败");
    }
  }

  /**
   * 获取用户活动记录
   * GET /api/users/:id/activities
   */
  async getUserActivities(req, res) {
    try {
      const { id } = req.params;
      const currentUserId = req.user.id;
      const isAdmin = req.user.role === "admin";
      const { page = 1, limit = 20, type } = req.query;

      // 权限检查
      if (currentUserId !== parseInt(id) && !isAdmin) {
        return sendError(res, "没有权限查看此用户的活动记录", 403);
      }

      const user = await User.findByPk(id);
      if (!user) {
        return sendError(res, "用户不存在", 404);
      }

      // 分页设置
      const pageNum = Math.max(1, parseInt(page));
      const pageSize = Math.min(50, Math.max(1, parseInt(limit)));
      const offset = (pageNum - 1) * pageSize;

      // 构建活动查询
      const activities = [];

      // 获取内容活动
      if (!type || type === "content") {
        const contents = await Content.findAll({
          where: { user_id: id },
          attributes: ["id", "title", "type", "created_at"],
          order: [["created_at", "DESC"]],
          limit: pageSize,
          offset: type ? offset : 0,
        });

        contents.forEach((content) => {
          activities.push({
            type: "content",
            action: "created",
            data: content,
            created_at: content.created_at,
          });
        });
      }

      // 获取评论活动
      if (!type || type === "comment") {
        const comments = await Comment.findAll({
          where: { user_id: id },
          attributes: ["id", "content", "target_type", "target_id", "created_at"],
          order: [["created_at", "DESC"]],
          limit: pageSize,
          offset: type ? offset : 0,
        });

        comments.forEach((comment) => {
          activities.push({
            type: "comment",
            action: "created",
            data: comment,
            created_at: comment.created_at,
          });
        });
      }

      // 按时间排序
      activities.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

      // 分页处理
      const startIndex = type ? 0 : offset;
      const endIndex = startIndex + pageSize;
      const paginatedActivities = activities.slice(startIndex, endIndex);

      const pagination = {
        current_page: pageNum,
        total_pages: Math.ceil(activities.length / pageSize),
        total_items: activities.length,
        items_per_page: pageSize,
        has_next: endIndex < activities.length,
        has_prev: pageNum > 1,
      };

      sendResponse(
        res,
        {
          activities: paginatedActivities,
          pagination,
        },
        "获取用户活动记录成功"
      );
    } catch (error) {
      logger.error("获取用户活动记录失败:", error);
      sendError(res, "获取用户活动记录失败");
    }
  }

  /**
   * 重置用户密码 (管理员)
   * POST /api/users/:id/reset-password
   */
  async resetUserPassword(req, res) {
    try {
      const { id } = req.params;
      const { new_password } = req.body;

      if (!new_password || new_password.length < 6) {
        return sendError(res, "新密码长度至少6位", 400);
      }

      const user = await User.findByPk(id);
      if (!user) {
        return sendError(res, "用户不存在", 404);
      }

      // 加密新密码
      const hashedPassword = await bcrypt.hash(new_password, 12);

      // 更新密码
      await user.update({
        password: hashedPassword,
        password_changed_at: new Date(),
      });

      logger.info(`管理员 ${req.user.id} 重置了用户 ${id} 的密码`);

      sendResponse(res, null, "密码重置成功");
    } catch (error) {
      logger.error("重置用户密码失败:", error);
      sendError(res, "重置用户密码失败");
    }
  }
}

module.exports = new UserController();
