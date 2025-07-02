module.exports = (sequelize, DataTypes) => {
  const Favorite = sequelize.define('Favorite', {
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
    content_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'contents',
        key: 'id'
      }
    },
    folder_name: {
      type: DataTypes.STRING(50),
      allowNull: true,
      defaultValue: '默认收藏夹',
      comment: '收藏夹名称'
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: '收藏备注'
    },
    created_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW
    }
  }, {
    tableName: 'favorites',
    timestamps: false,
    underscored: true,
    indexes: [
      {
        unique: true,
        fields: ['user_id', 'content_id'],
        name: 'unique_user_favorite'
      },
      { fields: ['content_id'] },
      { fields: ['user_id', 'folder_name'] },
      { fields: ['created_at'] }
    ]
  });

  // 类方法
  Favorite.isFavorited = async function(userId, contentId) {
    const favorite = await Favorite.findOne({
      where: {
        user_id: userId,
        content_id: contentId
      }
    });
    return !!favorite;
  };

  // 切换收藏状态
  Favorite.toggle = async function(userId, contentId, options = {}) {
    const { folderName = '默认收藏夹', notes = null } = options;
    
    const existingFavorite = await Favorite.findOne({
      where: {
        user_id: userId,
        content_id: contentId
      }
    });

    if (existingFavorite) {
      // 取消收藏
      await existingFavorite.destroy();
      
      // 减少内容的收藏数
      const Content = sequelize.models.Content;
      const content = await Content.findByPk(contentId);
      if (content) {
        await content.decrementFavorite();
      }
      
      return { action: 'unfavorited', favorited: false };
    } else {
      // 添加收藏
      await Favorite.create({
        user_id: userId,
        content_id: contentId,
        folder_name: folderName,
        notes: notes
      });
      
      // 增加内容的收藏数
      const Content = sequelize.models.Content;
      const content = await Content.findByPk(contentId);
      if (content) {
        await content.incrementFavorite();
      }
      
      return { action: 'favorited', favorited: true };
    }
  };

  // 获取用户收藏的内容列表
  Favorite.getUserFavorites = async function(userId, options = {}) {
    const { page = 1, limit = 20, folderName = null } = options;
    const offset = (page - 1) * limit;

    const whereClause = { user_id: userId };
    if (folderName) {
      whereClause.folder_name = folderName;
    }

    return Favorite.findAndCountAll({
      where: whereClause,
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

  // 获取用户的收藏夹列表
  Favorite.getUserFolders = async function(userId) {
    const folders = await Favorite.findAll({
      where: { user_id: userId },
      attributes: [
        'folder_name',
        [sequelize.fn('COUNT', sequelize.col('id')), 'count'],
        [sequelize.fn('MAX', sequelize.col('created_at')), 'latest_favorite']
      ],
      group: ['folder_name'],
      order: [['latest_favorite', 'DESC']]
    });

    return folders.map(folder => ({
      name: folder.folder_name,
      count: parseInt(folder.get('count')),
      latest_favorite: folder.get('latest_favorite')
    }));
  };

  // 移动收藏到指定文件夹
  Favorite.moveToFolder = async function(userId, contentId, newFolderName) {
    const favorite = await Favorite.findOne({
      where: {
        user_id: userId,
        content_id: contentId
      }
    });

    if (!favorite) {
      throw new Error('收藏记录不存在');
    }

    return favorite.update({ folder_name: newFolderName });
  };

  // 批量检查收藏状态
  Favorite.checkMultipleFavorites = async function(userId, contentIds) {
    const favorites = await Favorite.findAll({
      where: {
        user_id: userId,
        content_id: { [sequelize.Sequelize.Op.in]: contentIds }
      }
    });

    const favoriteMap = new Map();
    favorites.forEach(favorite => {
      favoriteMap.set(favorite.content_id, {
        favorited: true,
        folder_name: favorite.folder_name,
        notes: favorite.notes
      });
    });

    return contentIds.map(contentId => ({
      content_id: contentId,
      ...favoriteMap.get(contentId) || { favorited: false }
    }));
  };

  // 删除收藏夹（将收藏移到默认收藏夹）
  Favorite.deleteFolder = async function(userId, folderName) {
    if (folderName === '默认收藏夹') {
      throw new Error('不能删除默认收藏夹');
    }

    return Favorite.update(
      { folder_name: '默认收藏夹' },
      {
        where: {
          user_id: userId,
          folder_name: folderName
        }
      }
    );
  };

  // 重命名收藏夹
  Favorite.renameFolder = async function(userId, oldName, newName) {
    if (oldName === '默认收藏夹') {
      throw new Error('不能重命名默认收藏夹');
    }

    return Favorite.update(
      { folder_name: newName },
      {
        where: {
          user_id: userId,
          folder_name: oldName
        }
      }
    );
  };

  return Favorite;
}; 