module.exports = (sequelize, DataTypes) => {
  const Like = sequelize.define('Like', {
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
      comment: '目标ID（内容ID、评论ID等）'
    },
    target_type: {
      type: DataTypes.ENUM('content', 'comment'),
      allowNull: false,
      comment: '目标类型'
    },
    created_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW
    }
  }, {
    tableName: 'likes',
    timestamps: false,
    underscored: true,
    indexes: [
      {
        unique: true,
        fields: ['user_id', 'target_type', 'target_id'],
        name: 'unique_user_like'
      },
      { fields: ['target_type', 'target_id'] },
      { fields: ['user_id'] },
      { fields: ['created_at'] }
    ]
  });

  // 类方法
  Like.isLiked = async function(userId, targetType, targetId) {
    const like = await Like.findOne({
      where: {
        user_id: userId,
        target_type: targetType,
        target_id: targetId
      }
    });
    return !!like;
  };

  // 切换点赞状态
  Like.toggle = async function(userId, targetType, targetId) {
    const existingLike = await Like.findOne({
      where: {
        user_id: userId,
        target_type: targetType,
        target_id: targetId
      }
    });

    if (existingLike) {
      // 取消点赞
      await existingLike.destroy();
      
      // 减少目标的点赞数
      if (targetType === 'content') {
        const Content = sequelize.models.Content;
        const content = await Content.findByPk(targetId);
        if (content) {
          await content.decrementLike();
        }
      } else if (targetType === 'comment') {
        const Comment = sequelize.models.Comment;
        const comment = await Comment.findByPk(targetId);
        if (comment) {
          await comment.decrementLike();
        }
      }
      
      return { action: 'unliked', liked: false };
    } else {
      // 添加点赞
      await Like.create({
        user_id: userId,
        target_type: targetType,
        target_id: targetId
      });
      
      // 增加目标的点赞数
      if (targetType === 'content') {
        const Content = sequelize.models.Content;
        const content = await Content.findByPk(targetId);
        if (content) {
          await content.incrementLike();
        }
      } else if (targetType === 'comment') {
        const Comment = sequelize.models.Comment;
        const comment = await Comment.findByPk(targetId);
        if (comment) {
          await comment.incrementLike();
        }
      }
      
      return { action: 'liked', liked: true };
    }
  };

  // 获取用户点赞的内容列表
  Like.getUserLikedContents = async function(userId, options = {}) {
    const { page = 1, limit = 20 } = options;
    const offset = (page - 1) * limit;

    return Like.findAndCountAll({
      where: {
        user_id: userId,
        target_type: 'content'
      },
      include: [{
        model: sequelize.models.Content,
        as: 'content',
        where: { status: 'published', audit_status: 'approved' },
        include: [{
          model: sequelize.models.User,
          as: 'author',
          attributes: ['id', 'nickname', 'avatar']
        }]
      }],
      order: [['created_at', 'DESC']],
      limit,
      offset
    });
  };

  // 获取内容的点赞用户列表
  Like.getContentLikers = async function(contentId, options = {}) {
    const { page = 1, limit = 20 } = options;
    const offset = (page - 1) * limit;

    return Like.findAndCountAll({
      where: {
        target_type: 'content',
        target_id: contentId
      },
      include: [{
        model: sequelize.models.User,
        as: 'user',
        attributes: ['id', 'nickname', 'avatar', 'level']
      }],
      order: [['created_at', 'DESC']],
      limit,
      offset
    });
  };

  // 批量检查点赞状态
  Like.checkMultipleLikes = async function(userId, targets) {
    const likes = await Like.findAll({
      where: {
        user_id: userId,
        [sequelize.Sequelize.Op.or]: targets.map(target => ({
          target_type: target.type,
          target_id: target.id
        }))
      }
    });

    const likeMap = new Map();
    likes.forEach(like => {
      const key = `${like.target_type}-${like.target_id}`;
      likeMap.set(key, true);
    });

    return targets.map(target => ({
      type: target.type,
      id: target.id,
      liked: likeMap.has(`${target.type}-${target.id}`) || false
    }));
  };

  return Like;
}; 