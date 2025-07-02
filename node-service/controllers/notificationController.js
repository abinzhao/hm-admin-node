const { Op } = require("sequelize");
const { Notification, User } = require("../models");
const logger = require("../utils/logger");

class NotificationController {
  /**
   * 获取用户通知列表
   */
  async getNotifications(req, res) {
    try {
      const userId = req.user.id;
      const { page = 1, limit = 20, type, is_read } = req.query;
      const offset = (parseInt(page) - 1) * parseInt(limit);

      // 构建查询条件
      const whereClause = {
        user_id: userId,
      };

      if (type) {
        whereClause.type = type;
      }

      if (is_read !== undefined) {
        whereClause.is_read = is_read === "true";
      }

      const { count: total, rows: notifications } = await Notification.findAndCountAll({
        where: whereClause,
        include: [
          {
            model: User,
            as: "sender",
            attributes: ["id", "nickname", "avatar"],
            required: false,
          },
        ],
        order: [["created_at", "DESC"]],
        limit: parseInt(limit),
        offset,
      });

      res.status(200).json({
        success: true,
        data: {
          notifications,
          pagination: {
            current: parseInt(page),
            total: Math.ceil(total / parseInt(limit)),
            count: total,
            per_page: parseInt(limit),
          },
        },
      });
    } catch (error) {
      logger.error("获取通知列表失败:", error);
      res.status(500).json({
        success: false,
        message: "获取通知列表失败",
      });
    }
  }

  /**
   * 获取未读通知数量
   */
  async getUnreadCount(req, res) {
    try {
      const userId = req.user.id;

      const count = await Notification.count({
        where: {
          user_id: userId,
          is_read: false,
        },
      });

      res.status(200).json({
        success: true,
        data: {
          unreadCount: count,
        },
      });
    } catch (error) {
      logger.error("获取未读通知数量失败:", error);
      res.status(500).json({
        success: false,
        message: "获取未读通知数量失败",
      });
    }
  }

  /**
   * 标记通知为已读
   */
  async markAsRead(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user.id;

      const notification = await Notification.findOne({
        where: {
          id,
          user_id: userId,
        },
      });

      if (!notification) {
        return res.status(404).json({
          success: false,
          message: "通知不存在",
        });
      }

      await notification.update({
        is_read: true,
        read_at: new Date(),
      });

      res.status(200).json({
        success: true,
        message: "通知已标记为已读",
        data: notification,
      });
    } catch (error) {
      logger.error("标记通知已读失败:", error);
      res.status(500).json({
        success: false,
        message: "标记通知已读失败",
      });
    }
  }

  /**
   * 标记所有通知为已读
   */
  async markAllAsRead(req, res) {
    try {
      const userId = req.user.id;

      const [updatedCount] = await Notification.update(
        {
          is_read: true,
          read_at: new Date(),
        },
        {
          where: {
            user_id: userId,
            is_read: false,
          },
        }
      );

      res.status(200).json({
        success: true,
        message: `成功标记${updatedCount}个通知为已读`,
        data: {
          updatedCount,
        },
      });
    } catch (error) {
      logger.error("标记所有通知已读失败:", error);
      res.status(500).json({
        success: false,
        message: "标记所有通知已读失败",
      });
    }
  }

  /**
   * 创建系统通知（管理员）
   */
  async createSystemNotification(req, res) {
    try {
      const { title, content, type = "system", targetUsers } = req.body;

      if (!title || !content) {
        return res.status(400).json({
          success: false,
          message: "标题和内容不能为空",
        });
      }

      // 如果指定了目标用户，只发送给这些用户
      let userIds = [];
      if (targetUsers && Array.isArray(targetUsers) && targetUsers.length > 0) {
        userIds = targetUsers;
      } else {
        // 否则发送给所有活跃用户
        const users = await User.findAll({
          where: { status: "active" },
          attributes: ["id"],
        });
        userIds = users.map((user) => user.id);
      }

      // 批量创建通知
      const notifications = userIds.map((userId) => ({
        user_id: userId,
        type,
        title,
        content,
        sender_id: req.user.id,
      }));

      await Notification.bulkCreate(notifications);

      res.status(201).json({
        success: true,
        message: `成功发送通知给${userIds.length}个用户`,
        data: {
          recipientCount: userIds.length,
        },
      });
    } catch (error) {
      logger.error("创建系统通知失败:", error);
      res.status(500).json({
        success: false,
        message: "创建系统通知失败",
      });
    }
  }
}

module.exports = new NotificationController();
