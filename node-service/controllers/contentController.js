const { Op } = require("sequelize");
const { Content, User, Category, Tag, ContentTag, Comment, Like, Favorite } = require("../models");
const logger = require("../utils/logger");
const { validation } = require("../utils/validation");

class ContentController {
  /**
   * 创建内容
   */
  async createContent(req, res) {
    try {
      const {
        type,
        category_id,
        title,
        summary,
        content,
        cover_image,
        tags,
        // 问答特有字段
        reward_points,
        // 代码片段特有字段
        language,
        code_content,
      } = req.body;

      const userId = req.user.id;

      // 验证必填字段
      if (!type || !title || !content) {
        return res.status(400).json({
          success: false,
          message: "内容类型、标题和正文不能为空",
        });
      }

      // 验证内容类型
      if (!["article", "question", "snippet"].includes(type)) {
        return res.status(400).json({
          success: false,
          message: "无效的内容类型",
        });
      }

      // 验证标题长度
      if (title.length > 200) {
        return res.status(400).json({
          success: false,
          message: "标题长度不能超过200个字符",
        });
      }

      // 验证摘要长度
      if (summary && summary.length > 500) {
        return res.status(400).json({
          success: false,
          message: "摘要长度不能超过500个字符",
        });
      }

      // 验证分类是否存在
      if (category_id) {
        const category = await Category.findOne({
          where: {
            id: category_id,
            type,
            status: "active",
          },
        });

        if (!category) {
          return res.status(400).json({
            success: false,
            message: "分类不存在或已禁用",
          });
        }
      }

      // 创建内容
      const newContent = await Content.create({
        user_id: userId,
        type,
        category_id: category_id || null,
        title,
        summary: summary || null,
        content,
        cover_image: cover_image || null,
        reward_points: type === "question" ? reward_points || 0 : 0,
        language: type === "snippet" ? language : null,
        code_content: type === "snippet" ? code_content : null,
        status: "published",
        audit_status: "pending",
      });

      // 处理标签
      if (tags && Array.isArray(tags) && tags.length > 0) {
        await ContentTag.setContentTags(newContent.id, tags);
      }

      // 更新用户内容数量
      await User.increment("content_count", { where: { id: userId } });

      // 如果有分类，更新分类内容数量
      if (category_id) {
        await Category.increment("content_count", { where: { id: category_id } });
      }

      // 获取完整的内容信息
      const contentWithDetails = await Content.findByPk(newContent.id, {
        include: [
          {
            model: User,
            as: "author",
            attributes: ["id", "nickname", "avatar", "level"],
          },
          {
            model: Category,
            as: "category",
            attributes: ["id", "name", "slug"],
          },
          {
            model: Tag,
            as: "tags",
            attributes: ["id", "name", "slug", "color"],
            through: { attributes: [] },
          },
        ],
      });

      res.status(201).json({
        success: true,
        message: "内容创建成功，等待审核",
        data: contentWithDetails,
      });
    } catch (error) {
      logger.error("创建内容失败:", error);
      res.status(500).json({
        success: false,
        message: "创建内容失败，请稍后重试",
        error: process.env.NODE_ENV === "development" ? error.message : undefined,
      });
    }
  }

  /**
   * 获取内容列表
   */
  async getContents(req, res) {
    try {
      const { type, category_id, tag, keyword, sort = "latest", page = 1, limit = 20 } = req.query;

      const offset = (parseInt(page) - 1) * parseInt(limit);

      // 构建查询条件
      const whereClause = {
        status: "published",
        audit_status: "approved",
      };

      if (type) {
        whereClause.type = type;
      }

      if (category_id) {
        whereClause.category_id = category_id;
      }

      if (keyword) {
        whereClause[Op.or] = [
          { title: { [Op.like]: `%${keyword}%` } },
          { content: { [Op.like]: `%${keyword}%` } },
        ];
      }

      // 排序配置
      const orderMapping = {
        latest: [["published_at", "DESC"]],
        popular: [
          ["view_count", "DESC"],
          ["like_count", "DESC"],
        ],
        hot: [
          ["comment_count", "DESC"],
          ["like_count", "DESC"],
        ],
        featured: [
          ["is_featured", "DESC"],
          ["published_at", "DESC"],
        ],
      };

      const order = orderMapping[sort] || orderMapping.latest;

      // 查询内容
      let queryOptions = {
        where: whereClause,
        include: [
          {
            model: User,
            as: "author",
            attributes: ["id", "nickname", "avatar", "level"],
          },
          {
            model: Category,
            as: "category",
            attributes: ["id", "name", "slug"],
          },
          {
            model: Tag,
            as: "tags",
            attributes: ["id", "name", "slug", "color"],
            through: { attributes: [] },
          },
        ],
        order,
        limit: parseInt(limit),
        offset,
        distinct: true,
      };

      // 如果按标签筛选
      if (tag) {
        // 需要重新设计查询方式
        const tagCondition = await Tag.findOne({ where: { slug: tag } });
        if (tagCondition) {
          queryOptions.include.push({
            model: ContentTag,
            where: { tag_id: tagCondition.id },
            attributes: [],
          });
        }
      }

      const { rows: contents, count: total } = await Content.findAndCountAll(queryOptions);

      res.status(200).json({
        success: true,
        data: {
          contents,
          pagination: {
            current: parseInt(page),
            total: Math.ceil(total / parseInt(limit)),
            count: total,
            per_page: parseInt(limit),
          },
        },
      });
    } catch (error) {
      logger.error("获取内容列表失败:", error);
      res.status(500).json({
        success: false,
        message: "获取内容列表失败",
      });
    }
  }

  /**
   * 获取内容详情
   */
  async getContentById(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user?.id;

      const content = await Content.findOne({
        where: {
          id,
          status: "published",
          audit_status: "approved",
        },
        include: [
          {
            model: User,
            as: "author",
            attributes: ["id", "nickname", "avatar", "level", "bio", "follower_count"],
          },
          {
            model: Category,
            as: "category",
            attributes: ["id", "name", "slug"],
          },
          {
            model: Tag,
            as: "tags",
            attributes: ["id", "name", "slug", "color"],
            through: { attributes: [] },
          },
        ],
      });

      if (!content) {
        return res.status(404).json({
          success: false,
          message: "内容不存在或已被删除",
        });
      }

      // 增加浏览量
      await content.incrementView();

      // 获取用户互动状态
      let userInteraction = {
        liked: false,
        favorited: false,
      };

      if (userId) {
        const [liked, favorited] = await Promise.all([
          Like.isLiked(userId, "content", content.id),
          Favorite.isFavorited(userId, content.id),
        ]);

        userInteraction = { liked, favorited };
      }

      // 获取相关内容
      const relatedContents = await ContentTag.getRelatedContents(content.id, 5);

      res.status(200).json({
        success: true,
        data: {
          content,
          userInteraction,
          relatedContents,
        },
      });
    } catch (error) {
      logger.error("获取内容详情失败:", error);
      res.status(500).json({
        success: false,
        message: "获取内容详情失败",
      });
    }
  }

  /**
   * 更新内容
   */
  async updateContent(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user.id;
      const { title, summary, content, cover_image, category_id, tags, language, code_content } =
        req.body;

      // 查找内容
      const existingContent = await Content.findByPk(id);
      if (!existingContent) {
        return res.status(404).json({
          success: false,
          message: "内容不存在",
        });
      }

      // 检查权限
      if (!existingContent.canEdit(req.user)) {
        return res.status(403).json({
          success: false,
          message: "没有权限编辑此内容",
        });
      }

      // 验证数据
      if (title && title.length > 200) {
        return res.status(400).json({
          success: false,
          message: "标题长度不能超过200个字符",
        });
      }

      if (summary && summary.length > 500) {
        return res.status(400).json({
          success: false,
          message: "摘要长度不能超过500个字符",
        });
      }

      // 验证分类
      if (category_id && category_id !== existingContent.category_id) {
        const category = await Category.findOne({
          where: {
            id: category_id,
            type: existingContent.type,
            status: "active",
          },
        });

        if (!category) {
          return res.status(400).json({
            success: false,
            message: "分类不存在或已禁用",
          });
        }
      }

      // 更新内容
      const updateData = {};
      if (title !== undefined) updateData.title = title;
      if (summary !== undefined) updateData.summary = summary;
      if (content !== undefined) updateData.content = content;
      if (cover_image !== undefined) updateData.cover_image = cover_image;
      if (category_id !== undefined) updateData.category_id = category_id;
      if (language !== undefined && existingContent.type === "snippet") {
        updateData.language = language;
      }
      if (code_content !== undefined && existingContent.type === "snippet") {
        updateData.code_content = code_content;
      }

      // 如果是重要字段更新，重新设为待审核
      if (title || content) {
        updateData.audit_status = "pending";
      }

      await existingContent.update(updateData);

      // 更新标签
      if (tags !== undefined) {
        await ContentTag.setContentTags(id, tags);
      }

      // 获取更新后的内容
      const updatedContent = await Content.findByPk(id, {
        include: [
          {
            model: User,
            as: "author",
            attributes: ["id", "nickname", "avatar", "level"],
          },
          {
            model: Category,
            as: "category",
            attributes: ["id", "name", "slug"],
          },
          {
            model: Tag,
            as: "tags",
            attributes: ["id", "name", "slug", "color"],
            through: { attributes: [] },
          },
        ],
      });

      res.status(200).json({
        success: true,
        message: "内容更新成功",
        data: updatedContent,
      });
    } catch (error) {
      logger.error("更新内容失败:", error);
      res.status(500).json({
        success: false,
        message: "更新内容失败",
      });
    }
  }

  /**
   * 删除内容
   */
  async deleteContent(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user.id;

      const content = await Content.findByPk(id);
      if (!content) {
        return res.status(404).json({
          success: false,
          message: "内容不存在",
        });
      }

      // 检查权限
      if (!content.canEdit(req.user)) {
        return res.status(403).json({
          success: false,
          message: "没有权限删除此内容",
        });
      }

      // 软删除
      await content.update({ status: "deleted" });

      // 清理相关数据
      await ContentTag.clearContentTags(id);

      // 更新用户内容数量
      await User.decrement("content_count", { where: { id: content.user_id } });

      // 更新分类内容数量
      if (content.category_id) {
        await Category.decrement("content_count", { where: { id: content.category_id } });
      }

      res.status(200).json({
        success: true,
        message: "内容删除成功",
      });
    } catch (error) {
      logger.error("删除内容失败:", error);
      res.status(500).json({
        success: false,
        message: "删除内容失败",
      });
    }
  }

  /**
   * 点赞/取消点赞内容
   */
  async toggleLike(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user.id;

      const content = await Content.findOne({
        where: {
          id,
          status: "published",
          audit_status: "approved",
        },
      });

      if (!content) {
        return res.status(404).json({
          success: false,
          message: "内容不存在",
        });
      }

      const result = await Like.toggle(userId, "content", content.id);

      res.status(200).json({
        success: true,
        message: result.action === "liked" ? "点赞成功" : "取消点赞成功",
        data: result,
      });
    } catch (error) {
      logger.error("点赞操作失败:", error);
      res.status(500).json({
        success: false,
        message: "操作失败",
      });
    }
  }

  /**
   * 收藏/取消收藏内容
   */
  async toggleFavorite(req, res) {
    try {
      const { id } = req.params;
      const { folder_name, notes } = req.body;
      const userId = req.user.id;

      const content = await Content.findOne({
        where: {
          id,
          status: "published",
          audit_status: "approved",
        },
      });

      if (!content) {
        return res.status(404).json({
          success: false,
          message: "内容不存在",
        });
      }

      const result = await Favorite.toggle(userId, content.id, {
        folderName: folder_name,
        notes,
      });

      res.status(200).json({
        success: true,
        message: result.action === "favorited" ? "收藏成功" : "取消收藏成功",
        data: result,
      });
    } catch (error) {
      logger.error("收藏操作失败:", error);
      res.status(500).json({
        success: false,
        message: "操作失败",
      });
    }
  }

  /**
   * 获取用户的内容列表
   */
  async getUserContents(req, res) {
    try {
      const { userId } = req.params;
      const { type, status = "published", page = 1, limit = 20 } = req.query;
      const currentUserId = req.user?.id;

      const offset = (parseInt(page) - 1) * parseInt(limit);

      // 构建查询条件
      const whereClause = { user_id: userId };

      if (type) {
        whereClause.type = type;
      }

      // 只有作者本人或管理员可以看到非发布状态的内容
      if (currentUserId && (currentUserId == userId || req.user.role === "admin")) {
        if (status) {
          whereClause.status = status;
        }
      } else {
        whereClause.status = "published";
        whereClause.audit_status = "approved";
      }

      const { rows: contents, count: total } = await Content.findAndCountAll({
        where: whereClause,
        include: [
          {
            model: User,
            as: "author",
            attributes: ["id", "nickname", "avatar", "level"],
          },
          {
            model: Category,
            as: "category",
            attributes: ["id", "name", "slug"],
          },
          {
            model: Tag,
            as: "tags",
            attributes: ["id", "name", "slug", "color"],
            through: { attributes: [] },
          },
        ],
        order: [["created_at", "DESC"]],
        limit: parseInt(limit),
        offset,
      });

      res.status(200).json({
        success: true,
        data: {
          contents,
          pagination: {
            current: parseInt(page),
            total: Math.ceil(total / parseInt(limit)),
            count: total,
            per_page: parseInt(limit),
          },
        },
      });
    } catch (error) {
      logger.error("获取用户内容列表失败:", error);
      res.status(500).json({
        success: false,
        message: "获取用户内容列表失败",
      });
    }
  }

  /**
   * 内容审核（管理员/审核员）
   */
  async auditContent(req, res) {
    try {
      const { id } = req.params;
      const { action, reason } = req.body; // action: 'approve' | 'reject'
      const auditorId = req.user.id;

      // 验证操作类型
      if (!["approve", "reject"].includes(action)) {
        return res.status(400).json({
          success: false,
          message: "审核操作必须是 approve 或 reject",
        });
      }

      // 查找内容
      const content = await Content.findByPk(id, {
        include: [
          {
            model: User,
            as: "author",
            attributes: ["id", "nickname", "email"],
          },
        ],
      });

      if (!content) {
        return res.status(404).json({
          success: false,
          message: "内容不存在",
        });
      }

      // 检查内容状态
      if (content.audit_status !== "pending") {
        return res.status(400).json({
          success: false,
          message: "该内容已经审核过了",
        });
      }

      // 更新审核状态
      const updateData = {
        audit_status: action === "approve" ? "approved" : "rejected",
        auditor_id: auditorId,
        audited_at: new Date(),
      };

      if (action === "reject" && reason) {
        updateData.audit_reason = reason;
      }

      await content.update(updateData);

      // 创建审核通知
      await this.createAuditNotification(content, action, reason);

      // 记录审核日志
      logger.info("内容审核", {
        contentId: id,
        auditorId,
        action,
        reason: reason || "无",
        authorId: content.user_id,
      });

      res.status(200).json({
        success: true,
        message: action === "approve" ? "内容审核通过" : "内容审核拒绝",
        data: {
          contentId: id,
          audit_status: updateData.audit_status,
          audited_at: updateData.audited_at,
          auditor_id: auditorId,
        },
      });
    } catch (error) {
      logger.error("内容审核失败:", error);
      res.status(500).json({
        success: false,
        message: "审核失败，请稍后重试",
      });
    }
  }

  /**
   * 获取待审核内容列表（管理员/审核员）
   */
  async getPendingContents(req, res) {
    try {
      const { page = 1, limit = 20, type } = req.query;
      const offset = (parseInt(page) - 1) * parseInt(limit);

      const whereClause = {
        audit_status: "pending",
      };

      if (type) {
        whereClause.type = type;
      }

      const { count: total, rows: contents } = await Content.findAndCountAll({
        where: whereClause,
        include: [
          {
            model: User,
            as: "author",
            attributes: ["id", "nickname", "avatar", "level"],
          },
          {
            model: Category,
            as: "category",
            attributes: ["id", "name", "slug"],
          },
        ],
        order: [["created_at", "ASC"]], // 按创建时间升序，先审核早期内容
        limit: parseInt(limit),
        offset,
        distinct: true,
      });

      res.status(200).json({
        success: true,
        data: {
          contents,
          pagination: {
            current: parseInt(page),
            total: Math.ceil(total / parseInt(limit)),
            count: total,
            per_page: parseInt(limit),
          },
        },
      });
    } catch (error) {
      logger.error("获取待审核内容失败:", error);
      res.status(500).json({
        success: false,
        message: "获取待审核内容失败",
      });
    }
  }

  /**
   * 批量审核内容（管理员）
   */
  async batchAuditContent(req, res) {
    try {
      const { contentIds, action, reason } = req.body;
      const auditorId = req.user.id;

      if (!Array.isArray(contentIds) || contentIds.length === 0) {
        return res.status(400).json({
          success: false,
          message: "请选择要审核的内容",
        });
      }

      if (!["approve", "reject"].includes(action)) {
        return res.status(400).json({
          success: false,
          message: "审核操作必须是 approve 或 reject",
        });
      }

      // 查找待审核的内容
      const contents = await Content.findAll({
        where: {
          id: contentIds,
          audit_status: "pending",
        },
        include: [
          {
            model: User,
            as: "author",
            attributes: ["id", "nickname", "email"],
          },
        ],
      });

      if (contents.length === 0) {
        return res.status(400).json({
          success: false,
          message: "没有找到待审核的内容",
        });
      }

      // 批量更新审核状态
      const updateData = {
        audit_status: action === "approve" ? "approved" : "rejected",
        auditor_id: auditorId,
        audited_at: new Date(),
      };

      if (action === "reject" && reason) {
        updateData.audit_reason = reason;
      }

      await Content.update(updateData, {
        where: {
          id: contentIds,
          audit_status: "pending",
        },
      });

      // 为每个内容创建通知
      for (const content of contents) {
        await this.createAuditNotification(content, action, reason);
      }

      // 记录批量审核日志
      logger.info("批量内容审核", {
        contentIds,
        auditorId,
        action,
        reason: reason || "无",
        count: contents.length,
      });

      res.status(200).json({
        success: true,
        message: `成功${action === "approve" ? "通过" : "拒绝"}${contents.length}个内容`,
        data: {
          processedCount: contents.length,
          action,
        },
      });
    } catch (error) {
      logger.error("批量审核失败:", error);
      res.status(500).json({
        success: false,
        message: "批量审核失败，请稍后重试",
      });
    }
  }

  /**
   * 创建审核通知
   */
  async createAuditNotification(content, action, reason) {
    try {
      const { Notification } = require("../models");

      const notificationData = {
        user_id: content.user_id,
        type: "content_audit",
        title: `内容审核${action === "approve" ? "通过" : "被拒绝"}`,
        content:
          action === "approve"
            ? `您的内容《${content.title}》已审核通过并发布`
            : `您的内容《${content.title}》审核未通过。${reason ? `原因：${reason}` : ""}`,
        data: JSON.stringify({
          content_id: content.id,
          content_title: content.title,
          audit_action: action,
          audit_reason: reason || null,
        }),
      };

      await Notification.create(notificationData);
    } catch (error) {
      logger.error("创建审核通知失败:", error);
    }
  }
}

module.exports = new ContentController();
