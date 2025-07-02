/**
 * 聊天成员模型
 * 管理聊天会话中的成员关系
 */

module.exports = (sequelize, DataTypes) => {
  const ChatMember = sequelize.define(
    "ChatMember",
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
      user_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        comment: "用户ID",
        references: {
          model: "users",
          key: "id",
        },
      },
      role: {
        type: DataTypes.ENUM("admin", "member"),
        defaultValue: "member",
        comment: "成员角色：admin-管理员，member-普通成员",
      },
      nickname: {
        type: DataTypes.STRING(50),
        allowNull: true,
        comment: "群昵称",
      },
      is_muted: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        comment: "是否被禁言",
      },
      mute_until: {
        type: DataTypes.DATE,
        allowNull: true,
        comment: "禁言到期时间",
      },
      is_pinned: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        comment: "是否置顶聊天",
      },
      unread_count: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
        comment: "未读消息数",
      },
      last_read_message_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        comment: "最后阅读的消息ID",
      },
      last_read_time: {
        type: DataTypes.DATE,
        allowNull: true,
        comment: "最后阅读时间",
      },
      notification_enabled: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
        comment: "是否开启通知",
      },
      joined_at: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
        comment: "加入时间",
      },
      left_at: {
        type: DataTypes.DATE,
        allowNull: true,
        comment: "离开时间",
      },
      invited_by: {
        type: DataTypes.INTEGER,
        allowNull: true,
        comment: "邀请人ID",
        references: {
          model: "users",
          key: "id",
        },
      },
      status: {
        type: DataTypes.ENUM("active", "left", "kicked", "banned"),
        defaultValue: "active",
        comment: "成员状态",
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
      tableName: "chat_members",
      timestamps: true,
      underscored: true,
      indexes: [
        {
          fields: ["chat_id", "user_id"],
          unique: true,
        },
        {
          fields: ["chat_id", "status"],
        },
        {
          fields: ["user_id", "status"],
        },
        {
          fields: ["role"],
        },
      ],
    }
  );

  // 模型方法
  ChatMember.prototype.toJSON = function () {
    const values = { ...this.get() };
    return values;
  };

  // 检查是否为管理员
  ChatMember.prototype.isAdmin = function () {
    return this.role === "admin";
  };

  // 检查是否被禁言
  ChatMember.prototype.isMuted = function () {
    if (!this.is_muted) return false;
    if (!this.mute_until) return true;
    return new Date() < this.mute_until;
  };

  // 标记消息已读
  ChatMember.prototype.markAsRead = async function (messageId) {
    await this.update({
      last_read_message_id: messageId,
      last_read_time: new Date(),
      unread_count: 0,
    });
  };

  // 增加未读计数
  ChatMember.prototype.incrementUnreadCount = async function () {
    await this.increment("unread_count");
  };

  // 禁言成员
  ChatMember.prototype.mute = async function (muteUntil = null) {
    await this.update({
      is_muted: true,
      mute_until: muteUntil,
    });
  };

  // 解除禁言
  ChatMember.prototype.unmute = async function () {
    await this.update({
      is_muted: false,
      mute_until: null,
    });
  };

  // 静态方法：检查用户是否为聊天成员
  ChatMember.isMember = async function (chatId, userId) {
    const member = await ChatMember.findOne({
      where: {
        chat_id: chatId,
        user_id: userId,
        status: "active",
      },
    });
    return !!member;
  };

  // 静态方法：获取聊天成员列表
  ChatMember.getChatMembers = async function (chatId, options = {}) {
    const { User } = require("./index");
    const { limit = 50, offset = 0, status = "active" } = options;

    return await ChatMember.findAndCountAll({
      where: {
        chat_id: chatId,
        status,
      },
      include: [
        {
          model: User,
          as: "user",
          attributes: ["id", "nickname", "avatar", "level", "status"],
        },
      ],
      limit,
      offset,
      order: [
        ["role", "ASC"],
        ["joined_at", "ASC"],
      ],
    });
  };

  // 静态方法：添加成员到聊天
  ChatMember.addMember = async function (chatId, userId, invitedBy = null, role = "member") {
    const { Chat } = require("./index");

    // 检查聊天是否存在
    const chat = await Chat.findByPk(chatId);
    if (!chat) {
      throw new Error("聊天不存在");
    }

    // 检查是否已经是成员
    const existingMember = await ChatMember.findOne({
      where: {
        chat_id: chatId,
        user_id: userId,
      },
    });

    if (existingMember) {
      if (existingMember.status === "active") {
        throw new Error("用户已经是成员");
      } else {
        // 重新激活成员
        await existingMember.update({
          status: "active",
          role,
          joined_at: new Date(),
          left_at: null,
        });
        return existingMember;
      }
    }

    // 检查群聊成员数量限制
    if (chat.type === "group") {
      const memberCount = await ChatMember.count({
        where: {
          chat_id: chatId,
          status: "active",
        },
      });

      if (memberCount >= chat.max_members) {
        throw new Error("群聊成员已满");
      }
    }

    // 创建新成员
    return await ChatMember.create({
      chat_id: chatId,
      user_id: userId,
      role,
      invited_by: invitedBy,
      joined_at: new Date(),
    });
  };

  // 静态方法：移除成员
  ChatMember.removeMember = async function (chatId, userId, reason = "left") {
    const member = await ChatMember.findOne({
      where: {
        chat_id: chatId,
        user_id: userId,
        status: "active",
      },
    });

    if (!member) {
      throw new Error("成员不存在");
    }

    await member.update({
      status: reason,
      left_at: new Date(),
    });

    return member;
  };

  // 静态方法：获取用户的聊天列表
  ChatMember.getUserChats = async function (userId, options = {}) {
    const { Chat, User } = require("./index");
    const { limit = 20, offset = 0, type = null } = options;

    const whereClause = {
      user_id: userId,
      status: "active",
    };

    const chatWhereClause = {
      status: "active",
    };

    if (type) {
      chatWhereClause.type = type;
    }

    return await ChatMember.findAndCountAll({
      where: whereClause,
      include: [
        {
          model: Chat,
          as: "chat",
          where: chatWhereClause,
          include: [
            {
              model: User,
              as: "creator",
              attributes: ["id", "nickname", "avatar"],
            },
          ],
        },
      ],
      limit,
      offset,
      order: [
        ["is_pinned", "DESC"],
        [{ model: Chat, as: "chat" }, "last_message_time", "DESC"],
      ],
    });
  };

  return ChatMember;
};
