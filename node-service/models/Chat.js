/**
 * 聊天会话模型
 * 支持私聊和群聊
 */

module.exports = (sequelize, DataTypes) => {
  const Chat = sequelize.define(
    "Chat",
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      type: {
        type: DataTypes.ENUM("private", "group"),
        allowNull: false,
        defaultValue: "private",
        comment: "聊天类型：private-私聊，group-群聊",
      },
      name: {
        type: DataTypes.STRING(100),
        allowNull: true,
        comment: "群聊名称（私聊时为空）",
      },
      description: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: "群聊描述",
      },
      avatar: {
        type: DataTypes.STRING(500),
        allowNull: true,
        comment: "群聊头像URL",
      },
      creator_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        comment: "创建者ID",
        references: {
          model: "users",
          key: "id",
        },
      },
      max_members: {
        type: DataTypes.INTEGER,
        defaultValue: 500,
        comment: "最大成员数",
      },
      is_public: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        comment: "是否公开群聊",
      },
      join_approval: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
        comment: "是否需要审批加入",
      },
      mute_all: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        comment: "是否全员禁言",
      },
      status: {
        type: DataTypes.ENUM("active", "archived", "deleted"),
        defaultValue: "active",
        comment: "状态",
      },
      last_message_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        comment: "最后一条消息ID",
      },
      last_message_time: {
        type: DataTypes.DATE,
        allowNull: true,
        comment: "最后消息时间",
      },
      message_count: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
        comment: "消息总数",
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
      tableName: "chats",
      timestamps: true,
      underscored: true,
      indexes: [
        {
          fields: ["type"],
        },
        {
          fields: ["creator_id"],
        },
        {
          fields: ["status"],
        },
        {
          fields: ["last_message_time"],
        },
      ],
    }
  );

  // 模型方法
  Chat.prototype.toJSON = function () {
    const values = { ...this.get() };
    return values;
  };

  // 检查用户是否可以访问此聊天
  Chat.prototype.canAccess = function (user) {
    // 管理员可以访问所有聊天
    if (user.role === "admin") return true;

    // 私聊需要通过ChatMember表检查
    // 群聊需要检查成员身份
    return true; // 具体逻辑在ChatMember中实现
  };

  // 增加消息计数
  Chat.prototype.incrementMessageCount = async function () {
    await this.increment("message_count");
  };

  // 更新最后消息信息
  Chat.prototype.updateLastMessage = async function (messageId, messageTime) {
    await this.update({
      last_message_id: messageId,
      last_message_time: messageTime || new Date(),
    });
  };

  // 静态方法：创建私聊
  Chat.createPrivateChat = async function (user1Id, user2Id) {
    const { ChatMember } = require("./index");

    // 检查是否已存在私聊
    const existingChat = await Chat.findOne({
      where: { type: "private" },
      include: [
        {
          model: ChatMember,
          as: "members",
          where: {
            user_id: { [sequelize.Op.in]: [user1Id, user2Id] },
          },
          attributes: ["user_id"],
        },
      ],
      having: sequelize.literal("COUNT(members.user_id) = 2"),
      group: ["Chat.id"],
    });

    if (existingChat) {
      return existingChat;
    }

    // 创建新的私聊
    const chat = await Chat.create({
      type: "private",
      creator_id: user1Id,
    });

    // 添加成员
    await ChatMember.bulkCreate([
      {
        chat_id: chat.id,
        user_id: user1Id,
        role: "member",
        joined_at: new Date(),
      },
      {
        chat_id: chat.id,
        user_id: user2Id,
        role: "member",
        joined_at: new Date(),
      },
    ]);

    return chat;
  };

  // 静态方法：创建群聊
  Chat.createGroupChat = async function (
    creatorId,
    { name, description, avatar, maxMembers = 500, isPublic = false }
  ) {
    const { ChatMember } = require("./index");

    const chat = await Chat.create({
      type: "group",
      name,
      description,
      avatar,
      creator_id: creatorId,
      max_members: maxMembers,
      is_public: isPublic,
    });

    // 添加创建者为管理员
    await ChatMember.create({
      chat_id: chat.id,
      user_id: creatorId,
      role: "admin",
      joined_at: new Date(),
    });

    return chat;
  };

  return Chat;
};
