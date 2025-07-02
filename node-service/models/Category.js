module.exports = (sequelize, DataTypes) => {
  const Category = sequelize.define('Category', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    name: {
      type: DataTypes.STRING(50),
      allowNull: false
    },
    slug: {
      type: DataTypes.STRING(50),
      allowNull: false,
      unique: true
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    type: {
      type: DataTypes.ENUM('article', 'question', 'snippet', 'package'),
      allowNull: false
    },
    parent_id: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      comment: '父分类ID，0表示顶级分类'
    },
    icon: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    color: {
      type: DataTypes.STRING(10),
      allowNull: true
    },
    sort_order: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    status: {
      type: DataTypes.ENUM('active', 'inactive'),
      defaultValue: 'active'
    },
    content_count: {
      type: DataTypes.INTEGER,
      defaultValue: 0
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
    tableName: 'categories',
    timestamps: true,
    underscored: true,
    indexes: [
      { fields: ['type', 'status'] },
      { fields: ['parent_id', 'sort_order'] },
      { fields: ['slug'] }
    ],
    scopes: {
      // 活跃分类
      active: {
        where: { status: 'active' }
      },
      // 顶级分类
      topLevel: {
        where: { parent_id: 0 }
      },
      // 按类型筛选
      byType: (type) => ({
        where: { type }
      }),
      // 按排序
      ordered: {
        order: [['sort_order', 'ASC'], ['created_at', 'DESC']]
      }
    },
    hooks: {
      // 创建前生成slug
      beforeCreate: async (category) => {
        if (!category.slug && category.name) {
          category.slug = await generateSlug(category.name, Category);
        }
      },
      
      // 更新前处理slug
      beforeUpdate: async (category) => {
        if (category.changed('name') && (!category.slug || category.slug === category._previousDataValues.slug)) {
          category.slug = await generateSlug(category.name, Category);
        }
      }
    }
  });

  // 生成slug的辅助函数
  async function generateSlug(name, model) {
    const baseSlug = name
      .toLowerCase()
      .replace(/[^\w\s\u4e00-\u9fa5]/g, '')
      .replace(/\s+/g, '-')
      .substring(0, 50);
    
    let slug = baseSlug;
    let counter = 1;
    
    while (await model.findOne({ where: { slug } })) {
      slug = `${baseSlug}-${counter}`;
      counter++;
    }
    
    return slug;
  }

  // 类方法
  Category.getTreeStructure = async function(type = null) {
    const whereClause = { status: 'active' };
    if (type) {
      whereClause.type = type;
    }

    const categories = await Category.findAll({
      where: whereClause,
      order: [['sort_order', 'ASC'], ['created_at', 'DESC']]
    });

    // 构建树形结构
    const categoryMap = new Map();
    const tree = [];

    // 创建分类映射
    categories.forEach(category => {
      categoryMap.set(category.id, {
        ...category.toJSON(),
        children: []
      });
    });

    // 构建树形关系
    categories.forEach(category => {
      const categoryNode = categoryMap.get(category.id);
      
      if (category.parent_id === 0) {
        tree.push(categoryNode);
      } else {
        const parentNode = categoryMap.get(category.parent_id);
        if (parentNode) {
          parentNode.children.push(categoryNode);
        }
      }
    });

    return tree;
  };

  // 获取分类路径
  Category.getCategoryPath = async function(categoryId) {
    const path = [];
    let currentId = categoryId;

    while (currentId && currentId !== 0) {
      const category = await Category.findByPk(currentId);
      if (!category) break;
      
      path.unshift({
        id: category.id,
        name: category.name,
        slug: category.slug
      });
      
      currentId = category.parent_id;
    }

    return path;
  };

  // 实例方法
  Category.prototype.incrementContentCount = function() {
    return this.increment('content_count');
  };

  Category.prototype.decrementContentCount = function() {
    return this.decrement('content_count');
  };

  // 获取子分类
  Category.prototype.getChildren = function() {
    return Category.findAll({
      where: {
        parent_id: this.id,
        status: 'active'
      },
      order: [['sort_order', 'ASC']]
    });
  };

  // 获取父分类
  Category.prototype.getParent = function() {
    if (this.parent_id === 0) {
      return null;
    }
    return Category.findByPk(this.parent_id);
  };

  // 检查是否可以删除
  Category.prototype.canDelete = async function() {
    // 检查是否有子分类
    const childrenCount = await Category.count({
      where: { parent_id: this.id }
    });
    
    if (childrenCount > 0) {
      return { canDelete: false, reason: '存在子分类，无法删除' };
    }

    // 检查是否有关联内容
    if (this.content_count > 0) {
      return { canDelete: false, reason: '存在关联内容，无法删除' };
    }

    return { canDelete: true };
  };

  return Category;
}; 