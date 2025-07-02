/**
 * 移动端专用控制器
 * 为移动端提供优化的API接口
 */

const { Op } = require("sequelize");
const { User, Content, Chat, ChatMessage, Todo, Notification } = require("../models");
const logger = require("../utils/logger");

class MobileController {
  /**
   * 移动端首页数据聚合接口
   * 一次请求获取用户需要的所有首页数据
   */
  async getHomeData(req, res) {
    try {
      const userId = req.user.id;
      const {
        include_chats = true,
        include_todos = true,
        include_notifications = true,
      } = req.query;

      const homeData = {};

      // 获取用户基本信息
      const user = await User.findByPk(userId, {
        attributes: ["id", "nickname", "avatar", "level", "bio", "unread_count"],
      });
      homeData.user = user;

      // 获取最新内容（缓存优化）
      const recentContents = await Content.findAll({
        where: {
          status: "published",
          audit_status: "approved",
        },
        include: [
          {
            model: User,
            as: "author",
            attributes: ["id", "nickname", "avatar", "level"],
          },
        ],
        limit: 10,
        order: [["published_at", "DESC"]],
      });
      homeData.recentContents = recentContents;

      // 获取未读聊天（可选）
      if (include_chats === "true") {
        const { ChatMember } = require("../models");
        const unreadChats = await ChatMember.findAll({
          where: {
            user_id: userId,
            status: "active",
            unread_count: { [Op.gt]: 0 },
          },
          include: [
            {
              model: Chat,
              as: "chat",
              where: { status: "active" },
              include: [
                {
                  model: User,
                  as: "creator",
                  attributes: ["id", "nickname", "avatar"],
                },
              ],
            },
          ],
          limit: 5,
          order: [["updated_at", "DESC"]],
        });
        homeData.unreadChats = unreadChats;
      }

      // 获取待办事项（可选）
      if (include_todos === "true") {
        const urgentTodos = await Todo.findAll({
          where: {
            [Op.or]: [{ creator_id: userId }, { assignee_id: userId }],
            status: ["todo", "in_progress"],
            due_date: {
              [Op.lte]: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24小时内到期
            },
          },
          limit: 5,
          order: [["due_date", "ASC"]],
        });
        homeData.urgentTodos = urgentTodos;
      }

      // 获取未读通知（可选）
      if (include_notifications === "true") {
        const unreadNotifications = await Notification.findAll({
          where: {
            user_id: userId,
            is_read: false,
          },
          include: [
            {
              model: User,
              as: "sender",
              attributes: ["id", "nickname", "avatar"],
              required: false,
            },
          ],
          limit: 5,
          order: [["created_at", "DESC"]],
        });
        homeData.unreadNotifications = unreadNotifications;
      }

      // 添加统计信息
      homeData.stats = {
        totalUnreadChats: include_chats === "true" ? homeData.unreadChats?.length || 0 : 0,
        totalUrgentTodos: include_todos === "true" ? homeData.urgentTodos?.length || 0 : 0,
        totalUnreadNotifications:
          include_notifications === "true" ? homeData.unreadNotifications?.length || 0 : 0,
      };

      res.status(200).json({
        success: true,
        data: homeData,
        cached: false, // 实际应用中可以添加缓存逻辑
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error("获取移动端首页数据失败:", error);
      res.status(500).json({
        success: false,
        message: "获取首页数据失败",
      });
    }
  }

  /**
   * 移动端快速同步接口
   * 获取用户离线期间的更新
   */
  async quickSync(req, res) {
    try {
      const userId = req.user.id;
      const { last_sync_time } = req.query;

      if (!last_sync_time) {
        return res.status(400).json({
          success: false,
          message: "缺少上次同步时间",
        });
      }

      const lastSyncDate = new Date(last_sync_time);
      const syncData = {};

      // 获取新消息
      const { ChatMember } = require("../models");
      const userChats = await ChatMember.findAll({
        where: {
          user_id: userId,
          status: "active",
        },
        attributes: ["chat_id"],
      });

      const chatIds = userChats.map((membership) => membership.chat_id);

      if (chatIds.length > 0) {
        const newMessages = await ChatMessage.findAll({
          where: {
            chat_id: { [Op.in]: chatIds },
            created_at: { [Op.gt]: lastSyncDate },
            sender_id: { [Op.ne]: userId }, // 排除自己发送的消息
          },
          include: [
            {
              model: User,
              as: "sender",
              attributes: ["id", "nickname", "avatar"],
            },
          ],
          order: [["created_at", "ASC"]],
          limit: 100, // 限制数量避免数据过大
        });
        syncData.newMessages = newMessages;
      }

      // 获取新通知
      const newNotifications = await Notification.findAll({
        where: {
          user_id: userId,
          created_at: { [Op.gt]: lastSyncDate },
        },
        include: [
          {
            model: User,
            as: "sender",
            attributes: ["id", "nickname", "avatar"],
            required: false,
          },
        ],
        order: [["created_at", "DESC"]],
        limit: 50,
      });
      syncData.newNotifications = newNotifications;

      // 获取待办事项更新
      const updatedTodos = await Todo.findAll({
        where: {
          [Op.or]: [{ creator_id: userId }, { assignee_id: userId }],
          updated_at: { [Op.gt]: lastSyncDate },
        },
        order: [["updated_at", "DESC"]],
        limit: 50,
      });
      syncData.updatedTodos = updatedTodos;

      // 获取新内容
      const newContents = await Content.findAll({
        where: {
          status: "published",
          audit_status: "approved",
          published_at: { [Op.gt]: lastSyncDate },
        },
        include: [
          {
            model: User,
            as: "author",
            attributes: ["id", "nickname", "avatar"],
          },
        ],
        order: [["published_at", "DESC"]],
        limit: 20,
      });
      syncData.newContents = newContents;

      // 统计信息
      syncData.counts = {
        newMessages: syncData.newMessages?.length || 0,
        newNotifications: syncData.newNotifications?.length || 0,
        updatedTodos: syncData.updatedTodos?.length || 0,
        newContents: syncData.newContents?.length || 0,
      };

      res.status(200).json({
        success: true,
        data: syncData,
        syncTime: new Date().toISOString(),
        hasMore: false, // 实际应用中需要判断是否还有更多数据
      });
    } catch (error) {
      logger.error("快速同步失败:", error);
      res.status(500).json({
        success: false,
        message: "同步失败",
      });
    }
  }

  /**
   * 移动端离线数据接口
   * 为离线使用提供关键数据
   */
  async getOfflineData(req, res) {
    try {
      const userId = req.user.id;
      const { data_types = "all" } = req.query;

      const offlineData = {};

      // 获取用户信息
      if (data_types === "all" || data_types.includes("user")) {
        const user = await User.findByPk(userId, {
          attributes: ["id", "nickname", "avatar", "level", "bio"],
        });
        offlineData.user = user;
      }

      // 获取最近的聊天列表
      if (data_types === "all" || data_types.includes("chats")) {
        const { ChatMember } = require("../models");
        const recentChats = await ChatMember.findAll({
          where: {
            user_id: userId,
            status: "active",
          },
          include: [
            {
              model: Chat,
              as: "chat",
              where: { status: "active" },
              include: [
                {
                  model: User,
                  as: "creator",
                  attributes: ["id", "nickname", "avatar"],
                },
              ],
            },
          ],
          limit: 20,
          order: [["updated_at", "DESC"]],
        });
        offlineData.recentChats = recentChats;

        // 获取每个聊天的最近消息
        const chatMessages = {};
        for (const membership of recentChats) {
          const messages = await ChatMessage.findAll({
            where: {
              chat_id: membership.chat_id,
            },
            include: [
              {
                model: User,
                as: "sender",
                attributes: ["id", "nickname", "avatar"],
              },
            ],
            order: [["created_at", "DESC"]],
            limit: 20,
          });
          chatMessages[membership.chat_id] = messages.reverse();
        }
        offlineData.chatMessages = chatMessages;
      }

      // 获取待办事项
      if (data_types === "all" || data_types.includes("todos")) {
        const todos = await Todo.findAll({
          where: {
            [Op.or]: [{ creator_id: userId }, { assignee_id: userId }],
            status: { [Op.ne]: "completed" },
          },
          order: [["due_date", "ASC"]],
          limit: 50,
        });
        offlineData.todos = todos;
      }

      // 获取最近的内容
      if (data_types === "all" || data_types.includes("contents")) {
        const contents = await Content.findAll({
          where: {
            status: "published",
            audit_status: "approved",
          },
          include: [
            {
              model: User,
              as: "author",
              attributes: ["id", "nickname", "avatar"],
            },
          ],
          order: [["published_at", "DESC"]],
          limit: 30,
        });
        offlineData.contents = contents;
      }

      res.status(200).json({
        success: true,
        data: offlineData,
        timestamp: new Date().toISOString(),
        version: "1.0.0", // 可用于离线数据版本控制
      });
    } catch (error) {
      logger.error("获取离线数据失败:", error);
      res.status(500).json({
        success: false,
        message: "获取离线数据失败",
      });
    }
  }

  /**
   * 移动端批量操作接口
   * 优化网络请求，支持批量操作
   */
  async batchOperation(req, res) {
    try {
      const userId = req.user.id;
      const { operations } = req.body;

      if (!Array.isArray(operations) || operations.length === 0) {
        return res.status(400).json({
          success: false,
          message: "请提供有效的操作列表",
        });
      }

      const results = [];

      for (const operation of operations) {
        try {
          let result = null;

          switch (operation.type) {
            case "mark_notification_read":
              await Notification.update(
                { is_read: true, read_at: new Date() },
                {
                  where: {
                    id: operation.id,
                    user_id: userId,
                  },
                }
              );
              result = { success: true, message: "通知已标记为已读" };
              break;

            case "mark_chat_read":
              const { ChatMember } = require("../models");
              const member = await ChatMember.findOne({
                where: {
                  chat_id: operation.chat_id,
                  user_id: userId,
                  status: "active",
                },
              });
              if (member) {
                await member.markAsRead(operation.message_id);
                result = { success: true, message: "聊天已标记为已读" };
              } else {
                result = { success: false, message: "无权限操作此聊天" };
              }
              break;

            case "complete_todo":
              await Todo.update(
                {
                  status: "completed",
                  completed_at: new Date(),
                },
                {
                  where: {
                    id: operation.id,
                    [Op.or]: [{ creator_id: userId }, { assignee_id: userId }],
                  },
                }
              );
              result = { success: true, message: "待办事项已完成" };
              break;

            case "pin_chat":
              const { ChatMember: CM } = require("../models");
              await CM.update(
                { is_pinned: operation.pinned },
                {
                  where: {
                    chat_id: operation.chat_id,
                    user_id: userId,
                    status: "active",
                  },
                }
              );
              result = {
                success: true,
                message: operation.pinned ? "聊天已置顶" : "取消置顶",
              };
              break;

            default:
              result = { success: false, message: "不支持的操作类型" };
          }

          results.push({
            operation: operation.type,
            id: operation.id,
            result,
          });
        } catch (error) {
          results.push({
            operation: operation.type,
            id: operation.id,
            result: {
              success: false,
              message: error.message,
            },
          });
        }
      }

      const successCount = results.filter((r) => r.result.success).length;

      res.status(200).json({
        success: true,
        message: `批量操作完成，成功 ${successCount}/${operations.length} 项`,
        data: {
          results,
          successCount,
          totalCount: operations.length,
        },
      });
    } catch (error) {
      logger.error("批量操作失败:", error);
      res.status(500).json({
        success: false,
        message: "批量操作失败",
      });
    }
  }

  /**
   * 移动端轻量级搜索接口
   * 为移动端优化的搜索功能
   */
  async lightSearch(req, res) {
    try {
      const { keyword, type = "all", limit = 10 } = req.query;

      if (!keyword || keyword.trim().length === 0) {
        return res.status(400).json({
          success: false,
          message: "请输入搜索关键词",
        });
      }

      const searchResults = {};

      // 搜索用户
      if (type === "all" || type === "users") {
        const users = await User.findAll({
          where: {
            [Op.or]: [
              { nickname: { [Op.like]: `%${keyword}%` } },
              { username: { [Op.like]: `%${keyword}%` } },
            ],
            status: "active",
          },
          attributes: ["id", "nickname", "avatar", "level", "bio"],
          limit: parseInt(limit),
        });
        searchResults.users = users;
      }

      // 搜索内容
      if (type === "all" || type === "contents") {
        const contents = await Content.findAll({
          where: {
            [Op.or]: [
              { title: { [Op.like]: `%${keyword}%` } },
              { content: { [Op.like]: `%${keyword}%` } },
            ],
            status: "published",
            audit_status: "approved",
          },
          include: [
            {
              model: User,
              as: "author",
              attributes: ["id", "nickname", "avatar"],
            },
          ],
          attributes: ["id", "title", "summary", "type", "view_count", "like_count"],
          limit: parseInt(limit),
        });
        searchResults.contents = contents;
      }

      // 搜索聊天（群聊）
      if (type === "all" || type === "chats") {
        const chats = await Chat.findAll({
          where: {
            type: "group",
            is_public: true,
            name: { [Op.like]: `%${keyword}%` },
            status: "active",
          },
          attributes: ["id", "name", "description", "avatar", "max_members"],
          include: [
            {
              model: User,
              as: "creator",
              attributes: ["id", "nickname", "avatar"],
            },
          ],
          limit: parseInt(limit),
        });
        searchResults.chats = chats;
      }

      res.status(200).json({
        success: true,
        data: searchResults,
        keyword,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error("轻量级搜索失败:", error);
      res.status(500).json({
        success: false,
        message: "搜索失败",
      });
    }
  }

  /**
   * 移动端设备信息上报
   * 收集移动端设备信息用于优化
   */
  async reportDeviceInfo(req, res) {
    try {
      const userId = req.user.id;
      const {
        device_type,
        os_version,
        app_version,
        device_id,
        push_token,
        timezone,
        language,
        network_type,
      } = req.body;

      // 更新用户的设备信息（可以存储在User表的extra_data字段中）
      const deviceInfo = {
        device_type,
        os_version,
        app_version,
        device_id,
        push_token,
        timezone,
        language,
        network_type,
        last_report: new Date().toISOString(),
      };

      await User.update(
        {
          last_active_at: new Date(),
          device_info: deviceInfo, // 需要在User模型中添加这个字段
        },
        {
          where: { id: userId },
        }
      );

      res.status(200).json({
        success: true,
        message: "设备信息上报成功",
        data: {
          userId,
          reportTime: new Date().toISOString(),
        },
      });
    } catch (error) {
      logger.error("设备信息上报失败:", error);
      res.status(500).json({
        success: false,
        message: "设备信息上报失败",
      });
    }
  }

  /**
   * 移动端网络状态检测
   * 帮助移动端判断网络质量
   */
  async networkCheck(req, res) {
    try {
      const startTime = Date.now();

      // 模拟一些数据库操作来测试延迟
      await User.findByPk(req.user.id);

      const endTime = Date.now();
      const latency = endTime - startTime;

      // 判断网络质量
      let quality = "good";
      if (latency > 1000) {
        quality = "poor";
      } else if (latency > 500) {
        quality = "fair";
      }

      res.status(200).json({
        success: true,
        data: {
          latency: `${latency}ms`,
          quality,
          timestamp: new Date().toISOString(),
          serverTime: new Date().toISOString(),
        },
      });
    } catch (error) {
      logger.error("网络检测失败:", error);
      res.status(500).json({
        success: false,
        message: "网络检测失败",
      });
    }
  }
}

module.exports = new MobileController();
