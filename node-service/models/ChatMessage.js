/**
 * 聊天消息模型
 * 存储聊天消息内容和相关信息
 */

module.exports = (sequelize, DataTypes) => {
  const ChatMessage = sequelize.define(
    "ChatMessage",
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      chat_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        comment: "聊天会话ID",
        references: {
          model: "chats",
          key: "id",
        },
      },
      sender_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        comment: "发送者ID",
        references: {
          model: "users",
          key: "id",
        },
      },
      type: {
        type: DataTypes.ENUM("text", "image", "file", "voice", "video", "location", "system"),
        defaultValue: "text",
        comment: "消息类型",
      },
      content: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: "消息内容（文本消息）",
      },
      media_url: {
        type: DataTypes.STRING(500),
        allowNull: true,
        comment: "媒体文件URL",
      },
      media_type: {
        type: DataTypes.STRING(50),
        allowNull: true,
        comment: "媒体文件类型",
      },
      media_size: {
        type: DataTypes.INTEGER,
        allowNull: true,
        comment: "媒体文件大小（字节）",
      },
      media_duration: {
        type: DataTypes.INTEGER,
        allowNull: true,
        comment: "媒体文件时长（秒）",
      },
      thumbnail_url: {
        type: DataTypes.STRING(500),
        allowNull: true,
        comment: "缩略图URL",
      },
      reply_to_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        comment: "回复的消息ID",
        references: {
          model: "chat_messages",
          key: "id",
        },
      },
      forward_from_chat_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        comment: "转发来源聊天ID",
      },
      forward_from_message_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        comment: "转发来源消息ID",
      },
      location_latitude: {
        type: DataTypes.DECIMAL(10, 8),
        allowNull: true,
        comment: "位置纬度",
      },
      location_longitude: {
        type: DataTypes.DECIMAL(11, 8),
        allowNull: true,
        comment: "位置经度",
      },
      location_address: {
        type: DataTypes.STRING(200),
        allowNull: true,
        comment: "位置地址",
      },
      mentions: {
        type: DataTypes.JSON,
        allowNull: true,
        comment: "@提及的用户ID列表",
      },
      is_edited: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        comment: "是否已编辑",
      },
      edited_at: {
        type: DataTypes.DATE,
        allowNull: true,
        comment: "编辑时间",
      },
      is_deleted: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        comment: "是否已删除",
      },
      deleted_at: {
        type: DataTypes.DATE,
        allowNull: true,
        comment: "删除时间",
      },
      deleted_by: {
        type: DataTypes.INTEGER,
        allowNull: true,
        comment: "删除者ID",
        references: {
          model: "users",
          key: "id",
        },
      },
      read_count: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
        comment: "已读人数",
      },
      reaction_count: {
        type: DataTypes.JSON,
        allowNull: true,
        comment: "消息反应统计",
      },
      extra_data: {
        type: DataTypes.JSON,
        allowNull: true,
        comment: "扩展数据",
      },
      created_at: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
      },
      updated_at: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
      },
    },
    {
      tableName: "chat_messages",
      timestamps: true,
      underscored: true,
      indexes: [
        {
          fields: ["chat_id", "created_at"],
        },
        {
          fields: ["sender_id"],
        },
        {
          fields: ["type"],
        },
        {
          fields: ["reply_to_id"],
        },
        {
          fields: ["is_deleted"],
        },
      ],
    }
  );

  // 模型方法
  ChatMessage.prototype.toJSON = function () {
    const values = { ...this.get() };

    // 如果消息已删除，隐藏内容
    if (values.is_deleted) {
      values.content = "此消息已被删除";
      values.media_url = null;
      values.thumbnail_url = null;
    }

    return values;
  };

  // 检查用户是否可以编辑此消息
  ChatMessage.prototype.canEdit = function (user) {
    if (user.role === "admin") return true;
    if (this.sender_id === user.id) {
      // 只能编辑10分钟内的消息
      const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
      return this.created_at > tenMinutesAgo;
    }
    return false;
  };

  // 检查用户是否可以删除此消息
  ChatMessage.prototype.canDelete = function (user, chatMember) {
    if (user.role === "admin") return true;
    if (this.sender_id === user.id) return true;
    if (chatMember && chatMember.isAdmin()) return true;
    return false;
  };

  // 编辑消息
  ChatMessage.prototype.edit = async function (newContent) {
    await this.update({
      content: newContent,
      is_edited: true,
      edited_at: new Date(),
    });
  };

  // 删除消息
  ChatMessage.prototype.delete = async function (deletedBy) {
    await this.update({
      is_deleted: true,
      deleted_at: new Date(),
      deleted_by: deletedBy,
    });
  };

  // 增加已读计数
  ChatMessage.prototype.incrementReadCount = async function () {
    await this.increment("read_count");
  };

  // 添加反应
  ChatMessage.prototype.addReaction = async function (userId, emoji) {
    const reactions = this.reaction_count || {};
    if (!reactions[emoji]) {
      reactions[emoji] = [];
    }

    if (!reactions[emoji].includes(userId)) {
      reactions[emoji].push(userId);
      await this.update({ reaction_count: reactions });
    }
  };

  // 移除反应
  ChatMessage.prototype.removeReaction = async function (userId, emoji) {
    const reactions = this.reaction_count || {};
    if (reactions[emoji]) {
      reactions[emoji] = reactions[emoji].filter((id) => id !== userId);
      if (reactions[emoji].length === 0) {
        delete reactions[emoji];
      }
      await this.update({ reaction_count: reactions });
    }
  };

  // 静态方法：创建消息
  ChatMessage.createMessage = async function (data) {
    const { Chat, ChatMember } = require("./index");
    const { chatId, senderId, type, content, mediaUrl, replyToId, mentions } = data;

    // 检查聊天是否存在
    const chat = await Chat.findByPk(chatId);
    if (!chat) {
      throw new Error("聊天不存在");
    }

    // 检查发送者是否为成员
    const member = await ChatMember.findOne({
      where: {
        chat_id: chatId,
        user_id: senderId,
        status: "active",
      },
    });

    if (!member) {
      throw new Error("用户不是聊天成员");
    }

    // 检查是否被禁言
    if (member.isMuted()) {
      throw new Error("用户已被禁言");
    }

    // 检查群组是否全员禁言
    if (chat.mute_all && !member.isAdmin()) {
      throw new Error("群组已开启全员禁言");
    }

    // 创建消息
    const message = await ChatMessage.create({
      chat_id: chatId,
      sender_id: senderId,
      type,
      content,
      media_url: mediaUrl,
      reply_to_id: replyToId,
      mentions,
    });

    // 更新聊天的最后消息信息
    await chat.updateLastMessage(message.id, message.created_at);
    await chat.incrementMessageCount();

    // 更新其他成员的未读计数
    await ChatMember.increment("unread_count", {
      where: {
        chat_id: chatId,
        user_id: { [sequelize.Op.ne]: senderId },
        status: "active",
      },
    });

    return message;
  };

  // 静态方法：获取聊天消息列表
  ChatMessage.getChatMessages = async function (chatId, userId, options = {}) {
    const { ChatMember, User } = require("./index");
    const { limit = 50, offset = 0, beforeMessageId = null } = options;

    // 检查用户是否为成员
    const isMember = await ChatMember.isMember(chatId, userId);
    if (!isMember) {
      throw new Error("无权限查看此聊天");
    }

    const whereClause = {
      chat_id: chatId,
    };

    // 如果指定了beforeMessageId，则获取该消息之前的消息
    if (beforeMessageId) {
      whereClause.id = { [sequelize.Op.lt]: beforeMessageId };
    }

    return await ChatMessage.findAndCountAll({
      where: whereClause,
      include: [
        {
          model: User,
          as: "sender",
          attributes: ["id", "nickname", "avatar", "level"],
        },
        {
          model: ChatMessage,
          as: "replyToMessage",
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
      limit,
      offset,
      order: [["created_at", "DESC"]],
    });
  };

  // 静态方法：搜索消息
  ChatMessage.searchMessages = async function (chatId, userId, keyword, options = {}) {
    const { ChatMember, User } = require("./index");
    const { limit = 20, offset = 0, type = null } = options;

    // 检查用户是否为成员
    const isMember = await ChatMember.isMember(chatId, userId);
    if (!isMember) {
      throw new Error("无权限搜索此聊天");
    }

    const whereClause = {
      chat_id: chatId,
      is_deleted: false,
      content: { [sequelize.Op.like]: `%${keyword}%` },
    };

    if (type) {
      whereClause.type = type;
    }

    return await ChatMessage.findAndCountAll({
      where: whereClause,
      include: [
        {
          model: User,
          as: "sender",
          attributes: ["id", "nickname", "avatar"],
        },
      ],
      limit,
      offset,
      order: [["created_at", "DESC"]],
    });
  };

  return ChatMessage;
};
