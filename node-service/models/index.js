const { sequelize } = require("../config/database");
const { DataTypes } = require("sequelize");

// 导入已创建的模型
const User = require("./User")(sequelize, DataTypes);
const OAuthAccount = require("./OAuthAccount")(sequelize, DataTypes);
const UserFollow = require("./UserFollow")(sequelize, DataTypes);
const Category = require("./Category")(sequelize, DataTypes);
const Tag = require("./Tag")(sequelize, DataTypes);
const Content = require("./Content")(sequelize, DataTypes);
const ContentTag = require("./ContentTag")(sequelize, DataTypes);
const Comment = require("./Comment")(sequelize, DataTypes);
const Like = require("./Like")(sequelize, DataTypes);
const Favorite = require("./Favorite")(sequelize, DataTypes);
const Notification = require("./Notification")(sequelize, DataTypes);
const Todo = require("./Todo")(sequelize, DataTypes);
const FileUpload = require("./FileUpload")(sequelize, DataTypes);
const Chat = require("./Chat")(sequelize, DataTypes);
const ChatMember = require("./ChatMember")(sequelize, DataTypes);
const ChatMessage = require("./ChatMessage")(sequelize, DataTypes);

// 建立模型关联关系
function setupAssociations() {
  // ========== 用户相关关联 ==========

  // 用户 - OAuth账户 (一对多)
  User.hasMany(OAuthAccount, {
    foreignKey: "user_id",
    as: "oauthAccounts",
    onDelete: "CASCADE",
  });
  OAuthAccount.belongsTo(User, {
    foreignKey: "user_id",
    as: "user",
  });

  // 用户关注关系 (多对多，通过中间表)
  User.belongsToMany(User, {
    through: UserFollow,
    as: "followers",
    foreignKey: "following_id",
    otherKey: "follower_id",
  });
  User.belongsToMany(User, {
    through: UserFollow,
    as: "following",
    foreignKey: "follower_id",
    otherKey: "following_id",
  });

  // UserFollow与User的直接关联
  UserFollow.belongsTo(User, { foreignKey: "follower_id", as: "follower" });
  UserFollow.belongsTo(User, { foreignKey: "following_id", as: "following" });

  // ========== 内容相关关联 ==========

  // 用户 - 内容 (一对多)
  User.hasMany(Content, {
    foreignKey: "user_id",
    as: "contents",
    onDelete: "CASCADE",
  });
  Content.belongsTo(User, {
    foreignKey: "user_id",
    as: "author",
  });

  // 分类 - 内容 (一对多)
  Category.hasMany(Content, {
    foreignKey: "category_id",
    as: "contents",
    onDelete: "SET NULL",
  });
  Content.belongsTo(Category, {
    foreignKey: "category_id",
    as: "category",
  });

  // 内容 - 标签 (多对多)
  Content.belongsToMany(Tag, {
    through: ContentTag,
    as: "tags",
    foreignKey: "content_id",
    otherKey: "tag_id",
  });
  Tag.belongsToMany(Content, {
    through: ContentTag,
    as: "contents",
    foreignKey: "tag_id",
    otherKey: "content_id",
  });

  // ContentTag与Content、Tag的直接关联
  ContentTag.belongsTo(Content, { foreignKey: "content_id", as: "content" });
  ContentTag.belongsTo(Tag, { foreignKey: "tag_id", as: "tag" });

  // 审核员关联
  User.hasMany(Content, {
    foreignKey: "auditor_id",
    as: "auditedContents",
    onDelete: "SET NULL",
  });
  Content.belongsTo(User, {
    foreignKey: "auditor_id",
    as: "auditor",
  });

  // ========== 互动相关关联 ==========

  // 用户 - 评论 (一对多)
  User.hasMany(Comment, {
    foreignKey: "user_id",
    as: "comments",
    onDelete: "CASCADE",
  });
  Comment.belongsTo(User, {
    foreignKey: "user_id",
    as: "author",
  });

  // 用户 - 点赞 (一对多)
  User.hasMany(Like, {
    foreignKey: "user_id",
    as: "likes",
    onDelete: "CASCADE",
  });
  Like.belongsTo(User, {
    foreignKey: "user_id",
    as: "user",
  });

  // 用户 - 收藏 (一对多)
  User.hasMany(Favorite, {
    foreignKey: "user_id",
    as: "favorites",
    onDelete: "CASCADE",
  });
  Favorite.belongsTo(User, {
    foreignKey: "user_id",
    as: "user",
  });

  // 内容 - 收藏 (一对多)
  Content.hasMany(Favorite, {
    foreignKey: "content_id",
    as: "favorites",
    onDelete: "CASCADE",
  });
  Favorite.belongsTo(Content, {
    foreignKey: "content_id",
    as: "content",
  });

  // ========== 通知系统关联 ==========

  // 用户 - 通知 (一对多，接收者)
  User.hasMany(Notification, {
    foreignKey: "user_id",
    as: "notifications",
    onDelete: "CASCADE",
  });
  Notification.belongsTo(User, {
    foreignKey: "user_id",
    as: "recipient",
  });

  // 用户 - 通知 (一对多，发送者)
  User.hasMany(Notification, {
    foreignKey: "sender_id",
    as: "sentNotifications",
    onDelete: "SET NULL",
  });
  Notification.belongsTo(User, {
    foreignKey: "sender_id",
    as: "sender",
  });

  // ========== 待办事项关联 ==========

  // 用户 - 待办事项 (一对多，创建者)
  User.hasMany(Todo, {
    foreignKey: "creator_id",
    as: "createdTodos",
    onDelete: "CASCADE",
  });
  Todo.belongsTo(User, {
    foreignKey: "creator_id",
    as: "creator",
  });

  // 用户 - 待办事项 (一对多，负责人)
  User.hasMany(Todo, {
    foreignKey: "assignee_id",
    as: "assignedTodos",
    onDelete: "SET NULL",
  });
  Todo.belongsTo(User, {
    foreignKey: "assignee_id",
    as: "assignee",
  });

  // 待办事项自关联 (父子任务)
  Todo.hasMany(Todo, {
    foreignKey: "parent_id",
    as: "subtasks",
    onDelete: "CASCADE",
  });
  Todo.belongsTo(Todo, {
    foreignKey: "parent_id",
    as: "parent",
  });

  // ========== 文件上传关联 ==========

  // 用户 - 文件上传 (一对多)
  User.hasMany(FileUpload, {
    foreignKey: "uploader_id",
    as: "uploads",
    onDelete: "CASCADE",
  });
  FileUpload.belongsTo(User, {
    foreignKey: "uploader_id",
    as: "uploader",
  });

  // ========== 聊天系统关联 ==========

  // 用户 - 聊天 (一对多，创建者)
  User.hasMany(Chat, {
    foreignKey: "creator_id",
    as: "createdChats",
    onDelete: "CASCADE",
  });
  Chat.belongsTo(User, {
    foreignKey: "creator_id",
    as: "creator",
  });

  // 聊天 - 聊天成员 (一对多)
  Chat.hasMany(ChatMember, {
    foreignKey: "chat_id",
    as: "members",
    onDelete: "CASCADE",
  });
  ChatMember.belongsTo(Chat, {
    foreignKey: "chat_id",
    as: "chat",
  });

  // 用户 - 聊天成员 (一对多)
  User.hasMany(ChatMember, {
    foreignKey: "user_id",
    as: "chatMemberships",
    onDelete: "CASCADE",
  });
  ChatMember.belongsTo(User, {
    foreignKey: "user_id",
    as: "user",
  });

  // 用户 - 聊天成员 (一对多，邀请者)
  User.hasMany(ChatMember, {
    foreignKey: "invited_by",
    as: "chatInvitations",
    onDelete: "SET NULL",
  });
  ChatMember.belongsTo(User, {
    foreignKey: "invited_by",
    as: "inviter",
  });

  // 聊天 - 聊天消息 (一对多)
  Chat.hasMany(ChatMessage, {
    foreignKey: "chat_id",
    as: "messages",
    onDelete: "CASCADE",
  });
  ChatMessage.belongsTo(Chat, {
    foreignKey: "chat_id",
    as: "chat",
  });

  // 用户 - 聊天消息 (一对多，发送者)
  User.hasMany(ChatMessage, {
    foreignKey: "sender_id",
    as: "sentMessages",
    onDelete: "CASCADE",
  });
  ChatMessage.belongsTo(User, {
    foreignKey: "sender_id",
    as: "sender",
  });

  // 用户 - 聊天消息 (一对多，删除者)
  User.hasMany(ChatMessage, {
    foreignKey: "deleted_by",
    as: "deletedMessages",
    onDelete: "SET NULL",
  });
  ChatMessage.belongsTo(User, {
    foreignKey: "deleted_by",
    as: "deleter",
  });

  // 聊天消息自关联 (回复关系)
  ChatMessage.hasMany(ChatMessage, {
    foreignKey: "reply_to_id",
    as: "replies",
    onDelete: "SET NULL",
  });
  ChatMessage.belongsTo(ChatMessage, {
    foreignKey: "reply_to_id",
    as: "replyToMessage",
  });

  // 聊天 - 最后消息关联
  Chat.belongsTo(ChatMessage, {
    foreignKey: "last_message_id",
    as: "lastMessage",
  });
}

// 设置关联关系
setupAssociations();

// 导出已创建的模型和sequelize实例
module.exports = {
  sequelize,
  User,
  OAuthAccount,
  UserFollow,
  Category,
  Tag,
  Content,
  ContentTag,
  Comment,
  Like,
  Favorite,
  Notification,
  Todo,
  FileUpload,
  Chat,
  ChatMember,
  ChatMessage,
};
