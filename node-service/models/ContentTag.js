module.exports = (sequelize, DataTypes) => {
  const ContentTag = sequelize.define(
    "ContentTag",
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      content_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: "contents",
          key: "id",
        },
      },
      tag_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: "tags",
          key: "id",
        },
      },
      created_at: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
      },
    },
    {
      tableName: "content_tags",
      timestamps: false,
      underscored: true,
      indexes: [
        {
          unique: true,
          fields: ["content_id", "tag_id"],
          name: "unique_content_tag",
        },
        { fields: ["content_id"] },
        { fields: ["tag_id"] },
      ],
    }
  );

  // 类方法
  ContentTag.setContentTags = async function (contentId, tagNames) {
    const t = await sequelize.transaction();

    try {
      // 删除现有的标签关联
      await ContentTag.destroy({
        where: { content_id: contentId },
        transaction: t,
      });

      if (!tagNames || tagNames.length === 0) {
        await t.commit();
        return [];
      }

      // 创建或获取标签
      const Tag = sequelize.models.Tag;
      const tags = await Tag.findOrCreateByNames(tagNames);

      // 创建新的关联
      const contentTags = [];
      for (const tag of tags) {
        const contentTag = await ContentTag.create(
          {
            content_id: contentId,
            tag_id: tag.id,
          },
          { transaction: t }
        );

        contentTags.push(contentTag);
      }

      await t.commit();
      return contentTags;
    } catch (error) {
      await t.rollback();
      throw error;
    }
  };

  // 获取内容的标签
  ContentTag.getContentTags = async function (contentId) {
    return ContentTag.findAll({
      where: { content_id: contentId },
      include: [
        {
          model: sequelize.models.Tag,
          as: "tag",
          attributes: ["id", "name", "slug", "color"],
        },
      ],
      order: [["created_at", "ASC"]],
    });
  };

  // 获取标签下的内容
  ContentTag.getTagContents = async function (tagId, options = {}) {
    const { page = 1, limit = 20 } = options;
    const offset = (page - 1) * limit;

    return ContentTag.findAndCountAll({
      where: { tag_id: tagId },
      include: [
        {
          model: sequelize.models.Content,
          as: "content",
          where: {
            status: "published",
            audit_status: "approved",
          },
          include: [
            {
              model: sequelize.models.User,
              as: "author",
              attributes: ["id", "nickname", "avatar"],
            },
          ],
        },
      ],
      order: [["created_at", "DESC"]],
      limit,
      offset,
    });
  };

  // 获取相关内容（基于共同标签）
  ContentTag.getRelatedContents = async function (contentId, limit = 10) {
    // 获取当前内容的标签
    const currentContentTags = await ContentTag.findAll({
      where: { content_id: contentId },
      attributes: ["tag_id"],
    });

    if (currentContentTags.length === 0) {
      return [];
    }

    const tagIds = currentContentTags.map((ct) => ct.tag_id);

    // 查找有相同标签的其他内容
    const relatedContentTags = await ContentTag.findAll({
      where: {
        tag_id: { [sequelize.Sequelize.Op.in]: tagIds },
        content_id: { [sequelize.Sequelize.Op.ne]: contentId },
      },
      include: [
        {
          model: sequelize.models.Content,
          as: "content",
          where: {
            status: "published",
            audit_status: "approved",
          },
          include: [
            {
              model: sequelize.models.User,
              as: "author",
              attributes: ["id", "nickname", "avatar"],
            },
          ],
        },
      ],
      group: ["content_id"],
      order: [
        [sequelize.fn("COUNT", sequelize.col("tag_id")), "DESC"], // 按共同标签数排序
        ["created_at", "DESC"],
      ],
      limit,
    });

    return relatedContentTags.map((ct) => ct.content);
  };

  // 批量设置多个内容的标签
  ContentTag.batchSetTags = async function (contentTagPairs) {
    const t = await sequelize.transaction();

    try {
      const results = [];

      for (const pair of contentTagPairs) {
        const { contentId, tagNames } = pair;
        const contentTags = await ContentTag.setContentTags(contentId, tagNames);
        results.push({ contentId, tags: contentTags });
      }

      await t.commit();
      return results;
    } catch (error) {
      await t.rollback();
      throw error;
    }
  };

  // 删除内容的所有标签关联
  ContentTag.clearContentTags = async function (contentId) {
    const contentTags = await ContentTag.findAll({
      where: { content_id: contentId },
      include: [
        {
          model: sequelize.models.Tag,
          as: "tag",
        },
      ],
    });

    // 减少标签使用次数
    const Tag = sequelize.models.Tag;
    for (const contentTag of contentTags) {
      await contentTag.tag.decrementUsage();
    }

    // 删除关联
    return ContentTag.destroy({
      where: { content_id: contentId },
    });
  };

  // 添加单个标签到内容
  ContentTag.addTagToContent = async function (contentId, tagName) {
    const Tag = sequelize.models.Tag;
    const tags = await Tag.findOrCreateByNames([tagName]);

    if (tags.length === 0) {
      throw new Error("标签创建失败");
    }

    const tag = tags[0];

    // 检查是否已经关联
    const existingRelation = await ContentTag.findOne({
      where: {
        content_id: contentId,
        tag_id: tag.id,
      },
    });

    if (existingRelation) {
      return existingRelation;
    }

    return ContentTag.create({
      content_id: contentId,
      tag_id: tag.id,
    });
  };

  // 从内容中移除标签
  ContentTag.removeTagFromContent = async function (contentId, tagId) {
    const contentTag = await ContentTag.findOne({
      where: {
        content_id: contentId,
        tag_id: tagId,
      },
      include: [
        {
          model: sequelize.models.Tag,
          as: "tag",
        },
      ],
    });

    if (!contentTag) {
      return false;
    }

    // 减少标签使用次数
    await contentTag.tag.decrementUsage();

    // 删除关联
    await contentTag.destroy();

    return true;
  };

  return ContentTag;
};
