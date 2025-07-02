module.exports = (sequelize, DataTypes) => {
  const Tag = sequelize.define(
    "Tag",
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      name: {
        type: DataTypes.STRING(30),
        allowNull: false,
        unique: true,
      },
      slug: {
        type: DataTypes.STRING(50),
        allowNull: false,
        unique: true,
      },
      description: {
        type: DataTypes.STRING(255),
        allowNull: true,
      },
      color: {
        type: DataTypes.STRING(10),
        allowNull: true,
        comment: "标签颜色",
      },
      usage_count: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
        comment: "使用次数",
      },
      status: {
        type: DataTypes.ENUM("active", "inactive"),
        defaultValue: "active",
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
      tableName: "tags",
      timestamps: true,
      underscored: true,
      indexes: [
        { fields: ["name"] },
        { fields: ["usage_count"] },
        { fields: ["status"] },
        { fields: ["slug"] },
      ],
      scopes: {
        // 活跃标签
        active: {
          where: { status: "active" },
        },
        // 热门标签
        popular: {
          where: { status: "active" },
          order: [["usage_count", "DESC"]],
        },
        // 最新标签
        latest: {
          order: [["created_at", "DESC"]],
        },
      },
      hooks: {
        // 创建前生成slug
        beforeCreate: async (tag) => {
          if (!tag.slug && tag.name) {
            tag.slug = await generateSlug(tag.name, Tag);
          }
        },

        // 更新前处理slug
        beforeUpdate: async (tag) => {
          if (tag.changed("name") && (!tag.slug || tag.slug === tag._previousDataValues.slug)) {
            tag.slug = await generateSlug(tag.name, Tag);
          }
        },
      },
    }
  );

  // 生成slug的辅助函数
  async function generateSlug(name, model) {
    const baseSlug = name
      .toLowerCase()
      .replace(/[^\w\s\u4e00-\u9fa5]/g, "")
      .replace(/\s+/g, "-")
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
  Tag.findOrCreateByNames = async function (tagNames) {
    if (!Array.isArray(tagNames)) {
      tagNames = [tagNames];
    }

    const tags = [];

    for (const name of tagNames) {
      if (!name || typeof name !== "string") continue;

      const cleanName = name.trim().toLowerCase();
      if (cleanName.length === 0) continue;

      // 生成slug
      const baseSlug = cleanName
        .toLowerCase()
        .replace(/[^\w\s\u4e00-\u9fa5]/g, "")
        .replace(/\s+/g, "-")
        .substring(0, 50);

      let slug = baseSlug;
      let counter = 1;
      while (await sequelize.models.Tag.findOne({ where: { slug } })) {
        slug = `${baseSlug}-${counter}`;
        counter++;
      }

      let [tag, created] = await sequelize.models.Tag.findOrCreate({
        where: { name: cleanName },
        defaults: {
          name: cleanName,
          slug: slug,
          status: "active",
        },
      });

      // 如果是新创建的标签，增加使用次数
      if (!created) {
        await tag.increment("usage_count");
      } else {
        tag.usage_count = 1;
        await tag.save();
      }

      tags.push(tag);
    }

    return tags;
  };

  // 获取热门标签
  Tag.getPopularTags = async function (limit = 20) {
    return Tag.findAll({
      where: {
        status: "active",
        usage_count: { [sequelize.Sequelize.Op.gt]: 0 },
      },
      order: [["usage_count", "DESC"]],
      limit,
    });
  };

  // 搜索标签
  Tag.searchTags = async function (query, limit = 10) {
    return Tag.findAll({
      where: {
        status: "active",
        name: {
          [sequelize.Sequelize.Op.like]: `%${query}%`,
        },
      },
      order: [["usage_count", "DESC"]],
      limit,
    });
  };

  // 获取标签云数据
  Tag.getTagCloud = async function (limit = 50) {
    const tags = await Tag.findAll({
      where: {
        status: "active",
        usage_count: { [sequelize.Sequelize.Op.gt]: 0 },
      },
      order: [["usage_count", "DESC"]],
      limit,
    });

    // 计算权重
    const maxCount = tags.length > 0 ? tags[0].usage_count : 1;
    const minCount = tags.length > 0 ? tags[tags.length - 1].usage_count : 1;

    return tags.map((tag) => ({
      ...tag.toJSON(),
      weight: ((tag.usage_count - minCount) / (maxCount - minCount)) * 4 + 1, // 1-5的权重
    }));
  };

  // 实例方法
  Tag.prototype.incrementUsage = function () {
    return this.increment("usage_count");
  };

  Tag.prototype.decrementUsage = function () {
    if (this.usage_count > 0) {
      return this.decrement("usage_count");
    }
    return Promise.resolve(this);
  };

  // 检查是否可以删除
  Tag.prototype.canDelete = async function () {
    if (this.usage_count > 0) {
      return { canDelete: false, reason: "标签正在被使用，无法删除" };
    }
    return { canDelete: true };
  };

  // 获取相关内容数量
  Tag.prototype.getContentCount = async function () {
    const ContentTag = sequelize.models.ContentTag;
    return ContentTag.count({
      where: { tag_id: this.id },
    });
  };

  return Tag;
};
