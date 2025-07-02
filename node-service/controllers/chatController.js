/**
 * 聊天控制器
 * 处理聊天相关的API请求
 */

const { Op } = require("sequelize");
const { Chat, ChatMember, ChatMessage, User } = require("../models");
const logger = require("../utils/logger");
const socketService = require("../services/socketService");

class ChatController {
  /**
   * 获取用户的聊天列表
   */
  async getChats(req, res) {
    try {
      const userId = req.user.id;
      const { type, page = 1, limit = 20 } = req.query;

      const offset = (parseInt(page) - 1) * parseInt(limit);

      const result = await ChatMember.getUserChats(userId, {
        type,
        limit: parseInt(limit),
        offset,
      });

      // 获取私聊对方用户信息
      for (const membership of result.rows) {
        if (membership.chat.type === "private") {
          // 获取对方用户信息
          const otherMember = await ChatMember.findOne({
            where: {
              chat_id: membership.chat.id,
              user_id: { [Op.ne]: userId },
              status: "active",
            },
            include: [
              {
                model: User,
                as: "user",
                attributes: ["id", "nickname", "avatar", "level", "status"],
              },
            ],
          });

          if (otherMember) {
            membership.chat.dataValues.otherUser = otherMember.user;
            membership.chat.dataValues.name = otherMember.user.nickname;
            membership.chat.dataValues.avatar = otherMember.user.avatar;
          }
        }
      }

      res.status(200).json({
        success: true,
        data: {
          chats: result.rows,
          pagination: {
            current: parseInt(page),
            total: Math.ceil(result.count / parseInt(limit)),
            count: result.count,
            per_page: parseInt(limit),
          },
        },
      });
    } catch (error) {
      logger.error("获取聊天列表失败:", error);
      res.status(500).json({
        success: false,
        message: "获取聊天列表失败",
      });
    }
  }

  /**
   * 创建私聊
   */
  async createPrivateChat(req, res) {
    try {
      const userId = req.user.id;
      const { target_user_id } = req.body;

      // 验证目标用户
      if (target_user_id === userId) {
        return res.status(400).json({
          success: false,
          message: "不能与自己创建聊天",
        });
      }

      const targetUser = await User.findByPk(target_user_id);
      if (!targetUser) {
        return res.status(404).json({
          success: false,
          message: "目标用户不存在",
        });
      }

      // 创建私聊
      const chat = await Chat.createPrivateChat(userId, target_user_id);

      // 获取完整聊天信息
      const fullChat = await Chat.findByPk(chat.id, {
        include: [
          {
            model: User,
            as: "creator",
            attributes: ["id", "nickname", "avatar"],
          },
          {
            model: ChatMember,
            as: "members",
            include: [
              {
                model: User,
                as: "user",
                attributes: ["id", "nickname", "avatar", "level"],
              },
            ],
          },
        ],
      });

      res.status(201).json({
        success: true,
        message: "私聊创建成功",
        data: { chat: fullChat },
      });
    } catch (error) {
      logger.error("创建私聊失败:", error);
      res.status(500).json({
        success: false,
        message: "创建私聊失败",
      });
    }
  }

  /**
   * 创建群聊
   */
  async createGroupChat(req, res) {
    try {
      const userId = req.user.id;
      const { name, description, avatar, max_members = 500, is_public = false } = req.body;

      // 验证群聊名称
      if (!name || name.trim().length === 0) {
        return res.status(400).json({
          success: false,
          message: "群聊名称不能为空",
        });
      }

      if (name.length > 50) {
        return res.status(400).json({
          success: false,
          message: "群聊名称长度不能超过50个字符",
        });
      }

      // 创建群聊
      const chat = await Chat.createGroupChat(userId, {
        name: name.trim(),
        description,
        avatar,
        maxMembers: max_members,
        isPublic: is_public,
      });

      // 获取完整聊天信息
      const fullChat = await Chat.findByPk(chat.id, {
        include: [
          {
            model: User,
            as: "creator",
            attributes: ["id", "nickname", "avatar"],
          },
          {
            model: ChatMember,
            as: "members",
            include: [
              {
                model: User,
                as: "user",
                attributes: ["id", "nickname", "avatar", "level"],
              },
            ],
          },
        ],
      });

      res.status(201).json({
        success: true,
        message: "群聊创建成功",
        data: { chat: fullChat },
      });
    } catch (error) {
      logger.error("创建群聊失败:", error);
      res.status(500).json({
        success: false,
        message: "创建群聊失败",
      });
    }
  }

  /**
   * 获取聊天详情
   */
  async getChatById(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user.id;

      // 检查用户是否为聊天成员
      const isMember = await ChatMember.isMember(id, userId);
      if (!isMember) {
        return res.status(403).json({
          success: false,
          message: "无权限访问此聊天",
        });
      }

      // 获取聊天详情
      const chat = await Chat.findByPk(id, {
        include: [
          {
            model: User,
            as: "creator",
            attributes: ["id", "nickname", "avatar"],
          },
          {
            model: ChatMember,
            as: "members",
            where: { status: "active" },
            include: [
              {
                model: User,
                as: "user",
                attributes: ["id", "nickname", "avatar", "level"],
              },
            ],
          },
          {
            model: ChatMessage,
            as: "lastMessage",
            required: false,
            include: [
              {
                model: User,
                as: "sender",
                attributes: ["id", "nickname"],
              },
            ],
          },
        ],
      });

      if (!chat) {
        return res.status(404).json({
          success: false,
          message: "聊天不存在",
        });
      }

      // 获取用户在此聊天中的成员信息
      const userMembership = await ChatMember.findOne({
        where: {
          chat_id: id,
          user_id: userId,
          status: "active",
        },
      });

      res.status(200).json({
        success: true,
        data: {
          chat,
          userMembership,
        },
      });
    } catch (error) {
      logger.error("获取聊天详情失败:", error);
      res.status(500).json({
        success: false,
        message: "获取聊天详情失败",
      });
    }
  }

  /**
   * 发送消息
   */
  async sendMessage(req, res) {
    try {
      const { id: chatId } = req.params;
      const userId = req.user.id;
      const { type = "text", content, media_url, reply_to_id, mentions } = req.body;

      // 验证消息内容
      if (type === "text" && (!content || content.trim().length === 0)) {
        return res.status(400).json({
          success: false,
          message: "文本消息内容不能为空",
        });
      }

      // 创建消息
      const message = await ChatMessage.createMessage({
        chatId,
        senderId: userId,
        type,
        content: content?.trim(),
        mediaUrl: media_url,
        replyToId: reply_to_id,
        mentions,
      });

      // 获取完整消息信息
      const fullMessage = await ChatMessage.findByPk(message.id, {
        include: [
          {
            model: User,
            as: "sender",
            attributes: ["id", "nickname", "avatar", "level"],
          },
        ],
      });

      // 通过WebSocket发送消息给其他成员
      socketService.broadcastToRoom(`chat:${chatId}`, "new_message", {
        message: fullMessage,
        chatId,
      });

      // 发送推送通知给其他成员
      const otherMembers = await ChatMember.findAll({
        where: {
          chat_id: chatId,
          user_id: { [Op.ne]: userId },
          status: "active",
          notification_enabled: true,
        },
        include: [
          {
            model: User,
            as: "user",
            attributes: ["id"],
          },
        ],
      });

      // 这里可以集成推送通知服务
      for (const member of otherMembers) {
        socketService.sendNotificationToUser(member.user_id, {
          type: "chat_message",
          title: req.user.nickname,
          content: type === "text" ? content : `发送了一个${type}`,
          data: {
            chatId,
            messageId: message.id,
          },
        });
      }

      res.status(201).json({
        success: true,
        message: "消息发送成功",
        data: { message: fullMessage },
      });
    } catch (error) {
      logger.error("发送消息失败:", error);
      res.status(500).json({
        success: false,
        message: error.message || "发送消息失败",
      });
    }
  }

  /**
   * 获取聊天消息列表
   */
  async getMessages(req, res) {
    try {
      const { id: chatId } = req.params;
      const userId = req.user.id;
      const { page = 1, limit = 50, before_message_id } = req.query;

      const offset = (parseInt(page) - 1) * parseInt(limit);

      const result = await ChatMessage.getChatMessages(chatId, userId, {
        limit: parseInt(limit),
        offset,
        beforeMessageId: before_message_id,
      });

      // 标记消息为已读
      const member = await ChatMember.findOne({
        where: {
          chat_id: chatId,
          user_id: userId,
          status: "active",
        },
      });

      if (member && result.rows.length > 0) {
        const latestMessage = result.rows[0];
        await member.markAsRead(latestMessage.id);
      }

      res.status(200).json({
        success: true,
        data: {
          messages: result.rows.reverse(), // 按时间正序返回
          pagination: {
            current: parseInt(page),
            total: Math.ceil(result.count / parseInt(limit)),
            count: result.count,
            per_page: parseInt(limit),
          },
        },
      });
    } catch (error) {
      logger.error("获取消息列表失败:", error);
      res.status(500).json({
        success: false,
        message: error.message || "获取消息列表失败",
      });
    }
  }

  /**
   * 编辑消息
   */
  async editMessage(req, res) {
    try {
      const { id: chatId, messageId } = req.params;
      const userId = req.user.id;
      const { content } = req.body;

      if (!content || content.trim().length === 0) {
        return res.status(400).json({
          success: false,
          message: "消息内容不能为空",
        });
      }

      // 获取消息
      const message = await ChatMessage.findOne({
        where: {
          id: messageId,
          chat_id: chatId,
          is_deleted: false,
        },
      });

      if (!message) {
        return res.status(404).json({
          success: false,
          message: "消息不存在",
        });
      }

      // 检查编辑权限
      if (!message.canEdit(req.user)) {
        return res.status(403).json({
          success: false,
          message: "无权限编辑此消息",
        });
      }

      // 编辑消息
      await message.edit(content.trim());

      // 获取更新后的消息
      const updatedMessage = await ChatMessage.findByPk(messageId, {
        include: [
          {
            model: User,
            as: "sender",
            attributes: ["id", "nickname", "avatar"],
          },
        ],
      });

      // 通过WebSocket通知其他成员
      socketService.broadcastToRoom(`chat:${chatId}`, "message_edited", {
        message: updatedMessage,
        chatId,
      });

      res.status(200).json({
        success: true,
        message: "消息编辑成功",
        data: { message: updatedMessage },
      });
    } catch (error) {
      logger.error("编辑消息失败:", error);
      res.status(500).json({
        success: false,
        message: "编辑消息失败",
      });
    }
  }

  /**
   * 删除消息
   */
  async deleteMessage(req, res) {
    try {
      const { id: chatId, messageId } = req.params;
      const userId = req.user.id;

      // 获取消息
      const message = await ChatMessage.findOne({
        where: {
          id: messageId,
          chat_id: chatId,
          is_deleted: false,
        },
      });

      if (!message) {
        return res.status(404).json({
          success: false,
          message: "消息不存在",
        });
      }

      // 获取用户成员信息
      const member = await ChatMember.findOne({
        where: {
          chat_id: chatId,
          user_id: userId,
          status: "active",
        },
      });

      // 检查删除权限
      if (!message.canDelete(req.user, member)) {
        return res.status(403).json({
          success: false,
          message: "无权限删除此消息",
        });
      }

      // 删除消息
      await message.delete(userId);

      // 通过WebSocket通知其他成员
      socketService.broadcastToRoom(`chat:${chatId}`, "message_deleted", {
        messageId,
        chatId,
        deletedBy: userId,
      });

      res.status(200).json({
        success: true,
        message: "消息删除成功",
      });
    } catch (error) {
      logger.error("删除消息失败:", error);
      res.status(500).json({
        success: false,
        message: "删除消息失败",
      });
    }
  }

  /**
   * 添加成员到群聊
   */
  async addMember(req, res) {
    try {
      const { id: chatId } = req.params;
      const userId = req.user.id;
      const { user_ids, role = "member" } = req.body;

      if (!Array.isArray(user_ids) || user_ids.length === 0) {
        return res.status(400).json({
          success: false,
          message: "请选择要添加的用户",
        });
      }

      // 检查聊天是否存在且为群聊
      const chat = await Chat.findOne({
        where: {
          id: chatId,
          type: "group",
          status: "active",
        },
      });

      if (!chat) {
        return res.status(404).json({
          success: false,
          message: "群聊不存在",
        });
      }

      // 检查操作权限
      const member = await ChatMember.findOne({
        where: {
          chat_id: chatId,
          user_id: userId,
          status: "active",
        },
      });

      if (!member || !member.isAdmin()) {
        return res.status(403).json({
          success: false,
          message: "只有管理员可以添加成员",
        });
      }

      const addedMembers = [];
      const errors = [];

      // 批量添加成员
      for (const targetUserId of user_ids) {
        try {
          const newMember = await ChatMember.addMember(chatId, targetUserId, userId, role);
          addedMembers.push(newMember);

          // 通过WebSocket通知群聊成员
          socketService.broadcastToRoom(`chat:${chatId}`, "member_added", {
            chatId,
            member: newMember,
            addedBy: userId,
          });
        } catch (error) {
          errors.push({
            userId: targetUserId,
            error: error.message,
          });
        }
      }

      res.status(200).json({
        success: true,
        message: `成功添加 ${addedMembers.length} 个成员`,
        data: {
          addedMembers,
          errors,
        },
      });
    } catch (error) {
      logger.error("添加成员失败:", error);
      res.status(500).json({
        success: false,
        message: "添加成员失败",
      });
    }
  }

  /**
   * 移除成员
   */
  async removeMember(req, res) {
    try {
      const { id: chatId, memberId } = req.params;
      const userId = req.user.id;

      // 检查聊天是否存在且为群聊
      const chat = await Chat.findOne({
        where: {
          id: chatId,
          type: "group",
          status: "active",
        },
      });

      if (!chat) {
        return res.status(404).json({
          success: false,
          message: "群聊不存在",
        });
      }

      // 检查操作权限
      const operator = await ChatMember.findOne({
        where: {
          chat_id: chatId,
          user_id: userId,
          status: "active",
        },
      });

      if (!operator || (!operator.isAdmin() && userId !== parseInt(memberId))) {
        return res.status(403).json({
          success: false,
          message: "没有权限执行此操作",
        });
      }

      // 移除成员
      const removedMember = await ChatMember.removeMember(chatId, memberId, "kicked");

      // 通过WebSocket通知
      socketService.broadcastToRoom(`chat:${chatId}`, "member_removed", {
        chatId,
        memberId,
        removedBy: userId,
      });

      res.status(200).json({
        success: true,
        message: "成员移除成功",
        data: { removedMember },
      });
    } catch (error) {
      logger.error("移除成员失败:", error);
      res.status(500).json({
        success: false,
        message: error.message || "移除成员失败",
      });
    }
  }

  /**
   * 获取聊天成员列表
   */
  async getMembers(req, res) {
    try {
      const { id: chatId } = req.params;
      const userId = req.user.id;
      const { page = 1, limit = 50 } = req.query;

      // 检查用户是否为聊天成员
      const isMember = await ChatMember.isMember(chatId, userId);
      if (!isMember) {
        return res.status(403).json({
          success: false,
          message: "无权限查看成员列表",
        });
      }

      const offset = (parseInt(page) - 1) * parseInt(limit);

      const result = await ChatMember.getChatMembers(chatId, {
        limit: parseInt(limit),
        offset,
      });

      res.status(200).json({
        success: true,
        data: {
          members: result.rows,
          pagination: {
            current: parseInt(page),
            total: Math.ceil(result.count / parseInt(limit)),
            count: result.count,
            per_page: parseInt(limit),
          },
        },
      });
    } catch (error) {
      logger.error("获取成员列表失败:", error);
      res.status(500).json({
        success: false,
        message: "获取成员列表失败",
      });
    }
  }

  /**
   * 标记消息已读
   */
  async markAsRead(req, res) {
    try {
      const { id: chatId } = req.params;
      const userId = req.user.id;
      const { message_id } = req.body;

      const member = await ChatMember.findOne({
        where: {
          chat_id: chatId,
          user_id: userId,
          status: "active",
        },
      });

      if (!member) {
        return res.status(403).json({
          success: false,
          message: "无权限访问此聊天",
        });
      }

      await member.markAsRead(message_id);

      res.status(200).json({
        success: true,
        message: "标记已读成功",
      });
    } catch (error) {
      logger.error("标记已读失败:", error);
      res.status(500).json({
        success: false,
        message: "标记已读失败",
      });
    }
  }

  /**
   * 搜索消息
   */
  async searchMessages(req, res) {
    try {
      const { id: chatId } = req.params;
      const userId = req.user.id;
      const { keyword, type, page = 1, limit = 20 } = req.query;

      if (!keyword || keyword.trim().length === 0) {
        return res.status(400).json({
          success: false,
          message: "搜索关键词不能为空",
        });
      }

      const offset = (parseInt(page) - 1) * parseInt(limit);

      const result = await ChatMessage.searchMessages(chatId, userId, keyword.trim(), {
        type,
        limit: parseInt(limit),
        offset,
      });

      res.status(200).json({
        success: true,
        data: {
          messages: result.rows,
          pagination: {
            current: parseInt(page),
            total: Math.ceil(result.count / parseInt(limit)),
            count: result.count,
            per_page: parseInt(limit),
          },
        },
      });
    } catch (error) {
      logger.error("搜索消息失败:", error);
      res.status(500).json({
        success: false,
        message: error.message || "搜索消息失败",
      });
    }
  }
}

module.exports = new ChatController();
