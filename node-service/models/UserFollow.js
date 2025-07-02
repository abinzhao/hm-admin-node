module.exports = (sequelize, DataTypes) => {
  const UserFollow = sequelize.define('UserFollow', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    follower_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id'
      },
      comment: '关注者ID'
    },
    following_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id'
      },
      comment: '被关注者ID'
    },
    created_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW
    }
  }, {
    tableName: 'user_follows',
    timestamps: false,
    underscored: true,
    indexes: [
      {
        unique: true,
        fields: ['follower_id', 'following_id'],
        name: 'unique_follow_relation'
      },
      { fields: ['follower_id'] },
      { fields: ['following_id'] },
      { fields: ['created_at'] }
    ]
  });

  // 类方法
  UserFollow.isFollowing = async function(followerId, followingId) {
    const follow = await UserFollow.findOne({
      where: {
        follower_id: followerId,
        following_id: followingId
      }
    });
    return !!follow;
  };

  // 切换关注状态
  UserFollow.toggle = async function(followerId, followingId) {
    // 不能关注自己
    if (followerId === followingId) {
      throw new Error('不能关注自己');
    }

    const existingFollow = await UserFollow.findOne({
      where: {
        follower_id: followerId,
        following_id: followingId
      }
    });

    const User = sequelize.models.User;

    if (existingFollow) {
      // 取消关注
      await existingFollow.destroy();
      
      // 更新用户统计
      await Promise.all([
        User.decrement('following_count', { where: { id: followerId } }),
        User.decrement('follower_count', { where: { id: followingId } })
      ]);
      
      return { action: 'unfollowed', following: false };
    } else {
      // 添加关注
      await UserFollow.create({
        follower_id: followerId,
        following_id: followingId
      });
      
      // 更新用户统计
      await Promise.all([
        User.increment('following_count', { where: { id: followerId } }),
        User.increment('follower_count', { where: { id: followingId } })
      ]);

      // 创建关注通知
      const Notification = sequelize.models.Notification;
      await Notification.createNotification({
        userId: followingId,
        type: 'user_follow',
        title: '新的关注者',
        content: '有新用户关注了你',
        data: { follower_id: followerId },
        senderId: followerId
      });
      
      return { action: 'followed', following: true };
    }
  };

  // 获取用户的关注列表
  UserFollow.getFollowing = async function(userId, options = {}) {
    const { page = 1, limit = 20 } = options;
    const offset = (page - 1) * limit;

    return UserFollow.findAndCountAll({
      where: { follower_id: userId },
      include: [{
        model: sequelize.models.User,
        as: 'following',
        attributes: ['id', 'nickname', 'avatar', 'bio', 'follower_count', 'content_count']
      }],
      order: [['created_at', 'DESC']],
      limit,
      offset
    });
  };

  // 获取用户的粉丝列表
  UserFollow.getFollowers = async function(userId, options = {}) {
    const { page = 1, limit = 20 } = options;
    const offset = (page - 1) * limit;

    return UserFollow.findAndCountAll({
      where: { following_id: userId },
      include: [{
        model: sequelize.models.User,
        as: 'follower',
        attributes: ['id', 'nickname', 'avatar', 'bio', 'follower_count', 'content_count']
      }],
      order: [['created_at', 'DESC']],
      limit,
      offset
    });
  };

  // 获取共同关注的用户
  UserFollow.getMutualFollowing = async function(userId1, userId2) {
    const user1Following = await UserFollow.findAll({
      where: { follower_id: userId1 },
      attributes: ['following_id']
    });

    const user2Following = await UserFollow.findAll({
      where: { follower_id: userId2 },
      attributes: ['following_id']
    });

    const user1FollowingIds = user1Following.map(f => f.following_id);
    const user2FollowingIds = user2Following.map(f => f.following_id);

    const mutualIds = user1FollowingIds.filter(id => user2FollowingIds.includes(id));

    if (mutualIds.length === 0) {
      return [];
    }

    const User = sequelize.models.User;
    return User.findAll({
      where: { 
        id: { [sequelize.Sequelize.Op.in]: mutualIds },
        status: 'active'
      },
      attributes: ['id', 'nickname', 'avatar', 'bio']
    });
  };

  // 获取可能感兴趣的用户（基于共同关注）
  UserFollow.getSuggestedUsers = async function(userId, limit = 10) {
    // 获取用户关注的人
    const following = await UserFollow.findAll({
      where: { follower_id: userId },
      attributes: ['following_id']
    });

    if (following.length === 0) {
      // 如果用户没有关注任何人，返回热门用户
      const User = sequelize.models.User;
      return User.findAll({
        where: { 
          id: { [sequelize.Sequelize.Op.ne]: userId },
          status: 'active'
        },
        order: [['follower_count', 'DESC']],
        attributes: ['id', 'nickname', 'avatar', 'bio', 'follower_count'],
        limit
      });
    }

    const followingIds = following.map(f => f.following_id);

    // 获取这些人关注的其他用户
    const suggested = await UserFollow.findAll({
      where: {
        follower_id: { [sequelize.Sequelize.Op.in]: followingIds },
        following_id: { 
          [sequelize.Sequelize.Op.and]: [
            { [sequelize.Sequelize.Op.ne]: userId },
            { [sequelize.Sequelize.Op.notIn]: followingIds }
          ]
        }
      },
      attributes: [
        'following_id',
        [sequelize.fn('COUNT', sequelize.col('following_id')), 'mutual_count']
      ],
      group: ['following_id'],
      order: [[sequelize.fn('COUNT', sequelize.col('following_id')), 'DESC']],
      limit
    });

    if (suggested.length === 0) {
      return [];
    }

    const suggestedIds = suggested.map(s => s.following_id);
    const User = sequelize.models.User;
    
    return User.findAll({
      where: { 
        id: { [sequelize.Sequelize.Op.in]: suggestedIds },
        status: 'active'
      },
      attributes: ['id', 'nickname', 'avatar', 'bio', 'follower_count']
    });
  };

  // 批量检查关注状态
  UserFollow.checkMultipleFollows = async function(followerId, userIds) {
    const follows = await UserFollow.findAll({
      where: {
        follower_id: followerId,
        following_id: { [sequelize.Sequelize.Op.in]: userIds }
      }
    });

    const followMap = new Map();
    follows.forEach(follow => {
      followMap.set(follow.following_id, true);
    });

    return userIds.map(userId => ({
      user_id: userId,
      following: followMap.has(userId) || false
    }));
  };

  // 获取用户的关注动态
  UserFollow.getFollowingActivities = async function(userId, options = {}) {
    const { page = 1, limit = 20 } = options;
    const offset = (page - 1) * limit;

    // 获取关注的用户ID列表
    const following = await UserFollow.findAll({
      where: { follower_id: userId },
      attributes: ['following_id']
    });

    if (following.length === 0) {
      return { activities: [], total: 0, hasMore: false };
    }

    const followingIds = following.map(f => f.following_id);

    // 获取这些用户的最新内容
    const Content = sequelize.models.Content;
    const contents = await Content.findAndCountAll({
      where: {
        user_id: { [sequelize.Sequelize.Op.in]: followingIds },
        status: 'published',
        audit_status: 'approved'
      },
      include: [{
        model: sequelize.models.User,
        as: 'author',
        attributes: ['id', 'nickname', 'avatar']
      }],
      order: [['published_at', 'DESC']],
      limit,
      offset
    });

    return {
      activities: contents.rows,
      total: contents.count,
      hasMore: contents.count > offset + limit
    };
  };

  return UserFollow;
}; 