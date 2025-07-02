module.exports = (sequelize, DataTypes) => {
  const Comment = sequelize.define('Comment', {
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
    target_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      comment: '目标ID（内容ID或软件包ID）'
    },
    target_type: {
      type: DataTypes.ENUM('content', 'package'),
      allowNull: false,
      comment: '目标类型'
    },
    parent_id: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      comment: '父评论ID，0表示顶级评论'
    },
    content: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    like_count: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    reply_count: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    status: {
      type: DataTypes.ENUM('normal', 'hidden', 'deleted'),
      defaultValue: 'normal'
    },
    ip_address: {
      type: DataTypes.STRING(45),
      allowNull: true
    },
    user_agent: {
      type: DataTypes.STRING(500),
      allowNull: true
    },
    created_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW
    },
    updated_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW
    }
  }, {
    tableName: 'comments',
    timestamps: true,
    underscored: true,
    indexes: [
      { fields: ['target_type', 'target_id'] },
      { fields: ['user_id', 'status'] },
      { fields: ['parent_id'] },
      { fields: ['created_at'] }
    ],
    scopes: {
      // 正常状态的评论
      normal: {
        where: { status: 'normal' }
      },
      // 顶级评论
      topLevel: {
        where: { parent_id: 0 }
      },
      // 按目标筛选
      byTarget: (targetType, targetId) => ({
        where: { target_type: targetType, target_id: targetId }
      }),
      // 最新评论
      latest: {
        order: [['created_at', 'DESC']]
      },
      // 热门评论
      popular: {
        order: [['like_count', 'DESC'], ['created_at', 'DESC']]
      }
    }
  });

  // 类方法
  Comment.getCommentsWithReplies = async function(targetType, targetId, options = {}) {
    const { page = 1, limit = 20, sort = 'latest' } = options;
    const offset = (page - 1) * limit;
    
    const orderBy = sort === 'popular' 
      ? [['like_count', 'DESC'], ['created_at', 'DESC']]
      : [['created_at', 'DESC']];

    // 获取顶级评论
    const topComments = await Comment.findAndCountAll({
      where: {
        target_type: targetType,
        target_id: targetId,
        parent_id: 0,
        status: 'normal'
      },
      include: [{
        model: sequelize.models.User,
        as: 'author',
        attributes: ['id', 'nickname', 'avatar', 'level']
      }],
      order: orderBy,
      limit,
      offset
    });

    // 获取每个顶级评论的回复
    for (const comment of topComments.rows) {
      const replies = await Comment.findAll({
        where: {
          parent_id: comment.id,
          status: 'normal'
        },
        include: [{
          model: sequelize.models.User,
          as: 'author',
          attributes: ['id', 'nickname', 'avatar', 'level']
        }],
        order: [['created_at', 'ASC']],
        limit: 3 // 只显示前3个回复
      });
      
      comment.dataValues.replies = replies;
      comment.dataValues.hasMoreReplies = comment.reply_count > 3;
    }

    return {
      comments: topComments.rows,
      total: topComments.count,
      hasMore: topComments.count > offset + limit
    };
  };

  // 获取评论的回复
  Comment.getReplies = async function(commentId, options = {}) {
    const { page = 1, limit = 10 } = options;
    const offset = (page - 1) * limit;

    return Comment.findAndCountAll({
      where: {
        parent_id: commentId,
        status: 'normal'
      },
      include: [{
        model: sequelize.models.User,
        as: 'author',
        attributes: ['id', 'nickname', 'avatar', 'level']
      }],
      order: [['created_at', 'ASC']],
      limit,
      offset
    });
  };

  // 实例方法
  Comment.prototype.incrementLike = function() {
    return this.increment('like_count');
  };

  Comment.prototype.decrementLike = function() {
    if (this.like_count > 0) {
      return this.decrement('like_count');
    }
    return Promise.resolve(this);
  };

  Comment.prototype.incrementReply = function() {
    return this.increment('reply_count');
  };

  Comment.prototype.decrementReply = function() {
    if (this.reply_count > 0) {
      return this.decrement('reply_count');
    }
    return Promise.resolve(this);
  };

  // 检查是否可以编辑
  Comment.prototype.canEdit = function(user) {
    if (!user) return false;
    if (user.role === 'admin') return true;
    if (user.id === this.user_id) {
      // 只能在创建后30分钟内编辑
      const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);
      return this.created_at > thirtyMinutesAgo;
    }
    return false;
  };

  // 检查是否可以删除
  Comment.prototype.canDelete = function(user) {
    if (!user) return false;
    if (['admin', 'auditor'].includes(user.role)) return true;
    if (user.id === this.user_id) return true;
    return false;
  };

  // 软删除
  Comment.prototype.softDelete = function() {
    return this.update({ 
      status: 'deleted',
      content: '[该评论已被删除]'
    });
  };

  // 隐藏评论
  Comment.prototype.hide = function() {
    return this.update({ status: 'hidden' });
  };

  // 恢复评论
  Comment.prototype.restore = function() {
    return this.update({ status: 'normal' });
  };

  // 获取评论路径（用于回复）
  Comment.prototype.getPath = async function() {
    const path = [this];
    let currentComment = this;

    while (currentComment.parent_id !== 0) {
      const parentComment = await Comment.findByPk(currentComment.parent_id);
      if (!parentComment) break;
      
      path.unshift(parentComment);
      currentComment = parentComment;
    }

    return path;
  };

  return Comment;
}; 