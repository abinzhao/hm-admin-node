module.exports = (sequelize, DataTypes) => {
  const Notification = sequelize.define('Notification', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    user_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id'
      }
    },
    type: {
      type: DataTypes.ENUM(
        'system',           // 系统通知
        'content_like',     // 内容被点赞
        'content_comment',  // 内容被评论
        'content_favorite', // 内容被收藏
        'comment_reply',    // 评论被回复
        'comment_like',     // 评论被点赞
        'user_follow',      // 被关注
        'content_audit',    // 内容审核结果
        'announcement'      // 公告
      ),
      allowNull: false
    },
    title: {
      type: DataTypes.STRING(100),
      allowNull: false
    },
    content: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    data: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: '附加数据，如相关ID等'
    },
    sender_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'users',
        key: 'id'
      },
      comment: '发送者ID，系统通知为null'
    },
    is_read: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    read_at: {
      type: DataTypes.DATE,
      allowNull: true
    },
    created_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW
    }
  }, {
    tableName: 'notifications',
    timestamps: false,
    underscored: true,
    indexes: [
      { fields: ['user_id', 'is_read'] },
      { fields: ['type'] },
      { fields: ['created_at'] },
      { fields: ['sender_id'] }
    ],
    scopes: {
      // 未读通知
      unread: {
        where: { is_read: false }
      },
      // 按类型筛选
      byType: (type) => ({
        where: { type }
      }),
      // 最新通知
      latest: {
        order: [['created_at', 'DESC']]
      }
    }
  });

  // 类方法
  Notification.createNotification = async function(notificationData) {
    const {
      userId,
      type,
      title,
      content,
      data = null,
      senderId = null
    } = notificationData;

    return Notification.create({
      user_id: userId,
      type,
      title,
      content,
      data,
      sender_id: senderId
    });
  };

  // 批量创建通知
  Notification.createBatchNotifications = async function(notifications) {
    return Notification.bulkCreate(notifications);
  };

  // 创建系统通知（给所有用户）
  Notification.createSystemNotification = async function(notificationData) {
    const { title, content, data = null } = notificationData;
    
    // 获取所有活跃用户
    const User = sequelize.models.User;
    const users = await User.findAll({
      where: { status: 'active' },
      attributes: ['id']
    });

    const notifications = users.map(user => ({
      user_id: user.id,
      type: 'system',
      title,
      content,
      data
    }));

    return Notification.bulkCreate(notifications);
  };

  // 创建内容相关通知
  Notification.createContentNotification = async function(type, contentId, senderId, recipientId = null) {
    const Content = sequelize.models.Content;
    const User = sequelize.models.User;
    
    const content = await Content.findByPk(contentId, {
      include: [{
        model: User,
        as: 'author',
        attributes: ['id', 'nickname']
      }]
    });

    if (!content) {
      throw new Error('内容不存在');
    }

    const sender = await User.findByPk(senderId, {
      attributes: ['id', 'nickname']
    });

    if (!sender) {
      throw new Error('发送者不存在');
    }

    // 确定接收者
    const receiverId = recipientId || content.user_id;
    
    // 不给自己发通知
    if (receiverId === senderId) {
      return null;
    }

    const notificationMap = {
      content_like: {
        title: '你的内容被点赞了',
        content: `${sender.nickname} 点赞了你的「${content.title}」`
      },
      content_comment: {
        title: '你的内容有新评论',
        content: `${sender.nickname} 评论了你的「${content.title}」`
      },
      content_favorite: {
        title: '你的内容被收藏了',
        content: `${sender.nickname} 收藏了你的「${content.title}」`
      }
    };

    const notificationInfo = notificationMap[type];
    if (!notificationInfo) {
      throw new Error('不支持的通知类型');
    }

    return Notification.createNotification({
      userId: receiverId,
      type,
      title: notificationInfo.title,
      content: notificationInfo.content,
      data: {
        content_id: contentId,
        content_title: content.title,
        content_type: content.type
      },
      senderId
    });
  };

  // 创建评论通知
  Notification.createCommentNotification = async function(type, commentId, senderId, recipientId = null) {
    const Comment = sequelize.models.Comment;
    const User = sequelize.models.User;
    
    const comment = await Comment.findByPk(commentId);
    if (!comment) {
      throw new Error('评论不存在');
    }

    const sender = await User.findByPk(senderId, {
      attributes: ['id', 'nickname']
    });

    if (!sender) {
      throw new Error('发送者不存在');
    }

    // 确定接收者
    const receiverId = recipientId || comment.user_id;
    
    // 不给自己发通知
    if (receiverId === senderId) {
      return null;
    }

    const notificationMap = {
      comment_reply: {
        title: '你的评论有新回复',
        content: `${sender.nickname} 回复了你的评论`
      },
      comment_like: {
        title: '你的评论被点赞了',
        content: `${sender.nickname} 点赞了你的评论`
      }
    };

    const notificationInfo = notificationMap[type];
    if (!notificationInfo) {
      throw new Error('不支持的通知类型');
    }

    return Notification.createNotification({
      userId: receiverId,
      type,
      title: notificationInfo.title,
      content: notificationInfo.content,
      data: {
        comment_id: commentId,
        target_type: comment.target_type,
        target_id: comment.target_id
      },
      senderId
    });
  };

  // 获取用户通知列表
  Notification.getUserNotifications = async function(userId, options = {}) {
    const { page = 1, limit = 20, unreadOnly = false } = options;
    const offset = (page - 1) * limit;

    const whereClause = { user_id: userId };
    if (unreadOnly) {
      whereClause.is_read = false;
    }

    return Notification.findAndCountAll({
      where: whereClause,
      include: [{
        model: sequelize.models.User,
        as: 'sender',
        attributes: ['id', 'nickname', 'avatar'],
        required: false
      }],
      order: [['created_at', 'DESC']],
      limit,
      offset
    });
  };

  // 获取未读通知数量
  Notification.getUnreadCount = async function(userId) {
    return Notification.count({
      where: {
        user_id: userId,
        is_read: false
      }
    });
  };

  // 标记为已读
  Notification.markAsRead = async function(notificationIds, userId = null) {
    const whereClause = {
      id: { [sequelize.Sequelize.Op.in]: notificationIds }
    };
    
    if (userId) {
      whereClause.user_id = userId;
    }

    return Notification.update(
      { 
        is_read: true,
        read_at: new Date()
      },
      { where: whereClause }
    );
  };

  // 标记所有通知为已读
  Notification.markAllAsRead = async function(userId) {
    return Notification.update(
      { 
        is_read: true,
        read_at: new Date()
      },
      {
        where: {
          user_id: userId,
          is_read: false
        }
      }
    );
  };

  // 删除通知
  Notification.deleteNotification = async function(notificationId, userId) {
    return Notification.destroy({
      where: {
        id: notificationId,
        user_id: userId
      }
    });
  };

  // 批量删除通知
  Notification.batchDeleteNotifications = async function(notificationIds, userId) {
    return Notification.destroy({
      where: {
        id: { [sequelize.Sequelize.Op.in]: notificationIds },
        user_id: userId
      }
    });
  };

  // 清理过期通知（保留最近30天）
  Notification.cleanupExpiredNotifications = async function() {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    
    return Notification.destroy({
      where: {
        created_at: { [sequelize.Sequelize.Op.lt]: thirtyDaysAgo },
        is_read: true
      }
    });
  };

  return Notification;
}; 