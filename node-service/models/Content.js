module.exports = (sequelize, DataTypes) => {
  const Content = sequelize.define('Content', {
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
      type: DataTypes.ENUM('article', 'question', 'snippet'),
      allowNull: false
    },
    category_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'categories',
        key: 'id'
      }
    },
    title: {
      type: DataTypes.STRING(200),
      allowNull: false
    },
    slug: {
      type: DataTypes.STRING(200),
      allowNull: true,
      unique: true
    },
    summary: {
      type: DataTypes.STRING(500),
      allowNull: true
    },
    content: {
      type: DataTypes.TEXT('long'),
      allowNull: false
    },
    cover_image: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    // 问答特有字段
    reward_points: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    best_answer_id: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    // 代码片段特有字段
    language: {
      type: DataTypes.STRING(30),
      allowNull: true
    },
    code_content: {
      type: DataTypes.TEXT('long'),
      allowNull: true
    },
    // 统计字段
    view_count: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    like_count: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    favorite_count: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    comment_count: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    share_count: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    // 状态字段
    status: {
      type: DataTypes.ENUM('published', 'draft', 'deleted'),
      defaultValue: 'published'
    },
    audit_status: {
      type: DataTypes.ENUM('pending', 'approved', 'rejected'),
      defaultValue: 'pending'
    },
    audit_reason: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    auditor_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'users',
        key: 'id'
      }
    },
    audited_at: {
      type: DataTypes.DATE,
      allowNull: true
    },
    // 推荐字段
    is_featured: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    is_top: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    featured_at: {
      type: DataTypes.DATE,
      allowNull: true
    },
    // 时间字段
    published_at: {
      type: DataTypes.DATE,
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
    tableName: 'contents',
    timestamps: true,
    underscored: true,
    indexes: [
      { fields: ['user_id', 'type'] },
      { fields: ['type', 'status'] },
      { fields: ['category_id', 'status'] },
      { fields: ['audit_status'] },
      { fields: ['published_at'] },
      { fields: ['is_featured', 'is_top'] },
      { fields: ['view_count'] },
      { fields: ['like_count'] },
      { 
        type: 'FULLTEXT',
        name: 'content_fulltext',
        fields: ['title', 'content']
      }
    ],
    scopes: {
      // 已发布的内容
      published: {
        where: {
          status: 'published',
          audit_status: 'approved'
        }
      },
      // 按类型筛选
      byType: (type) => ({
        where: { type }
      }),
      // 热门内容
      popular: {
        order: [
          ['view_count', 'DESC'],
          ['like_count', 'DESC']
        ]
      },
      // 最新内容
      latest: {
        order: [['published_at', 'DESC']]
      },
      // 精选内容
      featured: {
        where: { is_featured: true }
      },
      // 置顶内容
      topped: {
        where: { is_top: true }
      }
    },
    hooks: {
      // 创建前生成slug
      beforeCreate: async (content) => {
        if (!content.slug && content.title) {
          content.slug = await generateSlug(content.title, Content);
        }
        
        // 设置发布时间
        if (content.status === 'published' && !content.published_at) {
          content.published_at = new Date();
        }
      },
      
      // 更新前处理
      beforeUpdate: (content) => {
        if (content.changed('status') && content.status === 'published' && !content.published_at) {
          content.published_at = new Date();
        }
      }
    }
  });

  // 生成slug的辅助函数
  async function generateSlug(title, model) {
    const baseSlug = title
      .toLowerCase()
      .replace(/[^\w\s\u4e00-\u9fa5]/g, '')
      .replace(/\s+/g, '-')
      .substring(0, 100);
    
    let slug = baseSlug;
    let counter = 1;
    
    while (await model.findOne({ where: { slug } })) {
      slug = `${baseSlug}-${counter}`;
      counter++;
    }
    
    return slug;
  }

  // 实例方法
  Content.prototype.incrementView = function() {
    return this.increment('view_count');
  };

  Content.prototype.incrementLike = function() {
    return this.increment('like_count');
  };

  Content.prototype.decrementLike = function() {
    return this.decrement('like_count');
  };

  Content.prototype.incrementFavorite = function() {
    return this.increment('favorite_count');
  };

  Content.prototype.decrementFavorite = function() {
    return this.decrement('favorite_count');
  };

  Content.prototype.incrementComment = function() {
    return this.increment('comment_count');
  };

  Content.prototype.decrementComment = function() {
    return this.decrement('comment_count');
  };

  // 获取内容摘要
  Content.prototype.getExcerpt = function(length = 200) {
    if (this.summary) {
      return this.summary;
    }
    
    const plainText = this.content
      .replace(/<[^>]*>/g, '') // 移除HTML标签
      .replace(/[#*`]/g, '') // 移除Markdown标记
      .trim();
    
    return plainText.length > length 
      ? plainText.substring(0, length) + '...'
      : plainText;
  };

  // 检查是否可以编辑
  Content.prototype.canEdit = function(user) {
    if (!user) return false;
    if (user.role === 'admin') return true;
    if (user.id === this.user_id) return true;
    return false;
  };

  // 检查是否可以审核
  Content.prototype.canAudit = function(user) {
    if (!user) return false;
    return ['admin', 'auditor'].includes(user.role);
  };

  return Content;
}; 