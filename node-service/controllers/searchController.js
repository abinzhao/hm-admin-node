const { User, Content, Comment, Tag, Category, Todo, FileUpload } = require("../models");
const { Op } = require("sequelize");
const logger = require("../utils/logger");
const { sendResponse, sendError } = require("../utils/helpers");

/**
 * 搜索控制器
 * 提供全文搜索、分类搜索、标签搜索等功能
 */
class SearchController {
  /**
   * 全局搜索
   * GET /api/search
   */
  async globalSearch(req, res) {
    try {
      const {
        q: query,
        type = "all",
        page = 1,
        limit = 20,
        sort_by = "relevance",
        sort_order = "DESC",
      } = req.query;

      if (!query || query.trim().length === 0) {
        return sendError(res, "搜索关键词不能为空", 400);
      }

      const searchTerm = query.trim();

      // 分页设置
      const pageNum = Math.max(1, parseInt(page));
      const pageSize = Math.min(50, Math.max(1, parseInt(limit)));
      const offset = (pageNum - 1) * pageSize;

      let results = {};

      if (type === "all" || type === "content") {
        results.contents = await this.searchContent(
          searchTerm,
          pageSize,
          offset,
          sort_by,
          sort_order
        );
      }

      if (type === "all" || type === "user") {
        results.users = await this.searchUsers(searchTerm, pageSize, offset);
      }

      if (type === "all" || type === "comment") {
        results.comments = await this.searchComments(searchTerm, pageSize, offset);
      }

      if (type === "all" || type === "tag") {
        results.tags = await this.searchTags(searchTerm, pageSize, offset);
      }

      if (type === "all" || type === "todo") {
        results.todos = await this.searchTodos(searchTerm, pageSize, offset, req.user?.id);
      }

      // 计算总数
      const totalCount = Object.values(results).reduce(
        (sum, result) => sum + (result.count || 0),
        0
      );

      // 记录搜索日志
      logger.info(
        `用户 ${req.user?.id || "anonymous"} 搜索: ${searchTerm}, 类型: ${type}, 结果数: ${totalCount}`
      );

      sendResponse(
        res,
        {
          query: searchTerm,
          type,
          results,
          total_count: totalCount,
          pagination: {
            current_page: pageNum,
            items_per_page: pageSize,
          },
        },
        "搜索完成"
      );
    } catch (error) {
      logger.error("全局搜索失败:", error);
      sendError(res, "搜索失败");
    }
  }

  /**
   * 搜索内容
   */
  async searchContent(searchTerm, limit, offset, sortBy = "relevance", sortOrder = "DESC") {
    try {
      const whereConditions = {
        [Op.and]: [
          {
            [Op.or]: [
              { title: { [Op.like]: `%${searchTerm}%` } },
              { summary: { [Op.like]: `%${searchTerm}%` } },
              { content: { [Op.like]: `%${searchTerm}%` } },
            ],
          },
          { audit_status: "approved" }, // 只搜索已审核通过的内容
        ],
      };

      // 排序设置
      let orderBy = [["created_at", "DESC"]];
      if (sortBy === "views") {
        orderBy = [
          ["view_count", sortOrder],
          ["created_at", "DESC"],
        ];
      } else if (sortBy === "likes") {
        orderBy = [
          ["like_count", sortOrder],
          ["created_at", "DESC"],
        ];
      } else if (sortBy === "updated") {
        orderBy = [["updated_at", sortOrder]];
      }

      const { count, rows: contents } = await Content.findAndCountAll({
        where: whereConditions,
        include: [
          { model: User, as: "author", attributes: ["id", "nickname", "avatar"] },
          { model: Category, as: "category", attributes: ["id", "name", "slug"] },
          {
            model: Tag,
            as: "tags",
            attributes: ["id", "name", "slug"],
            through: { attributes: [] },
          },
        ],
        order: orderBy,
        limit,
        offset,
        distinct: true,
      });

      return { count, items: contents };
    } catch (error) {
      logger.error("搜索内容失败:", error);
      return { count: 0, items: [] };
    }
  }

  /**
   * 搜索用户
   */
  async searchUsers(searchTerm, limit, offset) {
    try {
      const whereConditions = {
        [Op.and]: [
          {
            [Op.or]: [
              { username: { [Op.like]: `%${searchTerm}%` } },
              { nickname: { [Op.like]: `%${searchTerm}%` } },
              { bio: { [Op.like]: `%${searchTerm}%` } },
            ],
          },
          { status: "active" }, // 只搜索活跃用户
        ],
      };

      const { count, rows: users } = await User.findAndCountAll({
        where: whereConditions,
        attributes: { exclude: ["password", "email"] },
        order: [
          ["level", "DESC"],
          ["created_at", "DESC"],
        ],
        limit,
        offset,
      });

      return { count, items: users };
    } catch (error) {
      logger.error("搜索用户失败:", error);
      return { count: 0, items: [] };
    }
  }

  /**
   * 搜索评论
   */
  async searchComments(searchTerm, limit, offset) {
    try {
      const whereConditions = {
        [Op.and]: [{ content: { [Op.like]: `%${searchTerm}%` } }, { status: "active" }],
      };

      const { count, rows: comments } = await Comment.findAndCountAll({
        where: whereConditions,
        include: [{ model: User, as: "author", attributes: ["id", "nickname", "avatar"] }],
        order: [["created_at", "DESC"]],
        limit,
        offset,
      });

      return { count, items: comments };
    } catch (error) {
      logger.error("搜索评论失败:", error);
      return { count: 0, items: [] };
    }
  }

  /**
   * 搜索标签
   */
  async searchTags(searchTerm, limit, offset) {
    try {
      const whereConditions = {
        [Op.or]: [
          { name: { [Op.like]: `%${searchTerm}%` } },
          { description: { [Op.like]: `%${searchTerm}%` } },
        ],
      };

      const { count, rows: tags } = await Tag.findAndCountAll({
        where: whereConditions,
        order: [
          ["usage_count", "DESC"],
          ["name", "ASC"],
        ],
        limit,
        offset,
      });

      return { count, items: tags };
    } catch (error) {
      logger.error("搜索标签失败:", error);
      return { count: 0, items: [] };
    }
  }

  /**
   * 搜索待办事项 (需要登录)
   */
  async searchTodos(searchTerm, limit, offset, userId) {
    try {
      if (!userId || !Todo) {
        return { count: 0, items: [] };
      }

      const whereConditions = {
        [Op.and]: [
          {
            [Op.or]: [
              { title: { [Op.like]: `%${searchTerm}%` } },
              { description: { [Op.like]: `%${searchTerm}%` } },
            ],
          },
          {
            [Op.or]: [{ creator_id: userId }, { assignee_id: userId }, { is_public: true }],
          },
        ],
      };

      const { count, rows: todos } = await Todo.findAndCountAll({
        where: whereConditions,
        include: [
          { model: User, as: "creator", attributes: ["id", "nickname", "avatar"] },
          { model: User, as: "assignee", attributes: ["id", "nickname", "avatar"] },
        ],
        order: [
          ["priority", "DESC"],
          ["created_at", "DESC"],
        ],
        limit,
        offset,
      });

      return { count, items: todos };
    } catch (error) {
      logger.error("搜索待办事项失败:", error);
      return { count: 0, items: [] };
    }
  }

  /**
   * 高级搜索
   * POST /api/search/advanced
   */
  async advancedSearch(req, res) {
    try {
      const {
        query,
        content_type,
        category_id,
        tag_ids,
        author_id,
        date_range,
        sort_by = "relevance",
        sort_order = "DESC",
        page = 1,
        limit = 20,
      } = req.body;

      if (!query || query.trim().length === 0) {
        return sendError(res, "搜索关键词不能为空", 400);
      }

      // 构建复杂查询条件
      const whereConditions = {
        [Op.and]: [
          {
            [Op.or]: [
              { title: { [Op.like]: `%${query}%` } },
              { summary: { [Op.like]: `%${query}%` } },
              { content: { [Op.like]: `%${query}%` } },
            ],
          },
          { audit_status: "approved" },
        ],
      };

      // 内容类型筛选
      if (content_type) {
        whereConditions[Op.and].push({ type: content_type });
      }

      // 分类筛选
      if (category_id) {
        whereConditions[Op.and].push({ category_id });
      }

      // 作者筛选
      if (author_id) {
        whereConditions[Op.and].push({ user_id: author_id });
      }

      // 日期范围筛选
      if (date_range) {
        const { start_date, end_date } = date_range;
        if (start_date || end_date) {
          const dateCondition = {};
          if (start_date) dateCondition[Op.gte] = new Date(start_date);
          if (end_date) dateCondition[Op.lte] = new Date(end_date);
          whereConditions[Op.and].push({ created_at: dateCondition });
        }
      }

      // 分页设置
      const pageNum = Math.max(1, parseInt(page));
      const pageSize = Math.min(50, Math.max(1, parseInt(limit)));
      const offset = (pageNum - 1) * pageSize;

      // 排序设置
      let orderBy = [["created_at", "DESC"]];
      if (sort_by === "views") {
        orderBy = [
          ["view_count", sort_order],
          ["created_at", "DESC"],
        ];
      } else if (sort_by === "likes") {
        orderBy = [
          ["like_count", sort_order],
          ["created_at", "DESC"],
        ];
      } else if (sort_by === "updated") {
        orderBy = [["updated_at", sort_order]];
      }

      // 执行搜索
      let findOptions = {
        where: whereConditions,
        include: [
          { model: User, as: "author", attributes: ["id", "nickname", "avatar"] },
          { model: Category, as: "category", attributes: ["id", "name", "slug"] },
          {
            model: Tag,
            as: "tags",
            attributes: ["id", "name", "slug"],
            through: { attributes: [] },
          },
        ],
        order: orderBy,
        limit: pageSize,
        offset,
        distinct: true,
      };

      // 标签筛选（需要特殊处理）
      if (tag_ids && Array.isArray(tag_ids) && tag_ids.length > 0) {
        findOptions.include[2].where = { id: { [Op.in]: tag_ids } };
        findOptions.include[2].required = true;
      }

      const { count, rows: contents } = await Content.findAndCountAll(findOptions);

      // 分页信息
      const pagination = {
        current_page: pageNum,
        total_pages: Math.ceil(count / pageSize),
        total_items: count,
        items_per_page: pageSize,
        has_next: pageNum < Math.ceil(count / pageSize),
        has_prev: pageNum > 1,
      };

      logger.info(`高级搜索: ${query}, 结果数: ${count}`);

      sendResponse(
        res,
        {
          query,
          filters: {
            content_type,
            category_id,
            tag_ids,
            author_id,
            date_range,
          },
          contents,
          pagination,
        },
        "高级搜索完成"
      );
    } catch (error) {
      logger.error("高级搜索失败:", error);
      sendError(res, "高级搜索失败");
    }
  }

  /**
   * 搜索建议
   * GET /api/search/suggestions
   */
  async getSearchSuggestions(req, res) {
    try {
      const { q: query, limit = 10 } = req.query;

      if (!query || query.trim().length < 2) {
        return sendResponse(res, { suggestions: [] }, "获取搜索建议成功");
      }

      const searchTerm = query.trim();
      const suggestionLimit = Math.min(20, Math.max(1, parseInt(limit)));

      // 获取内容标题建议
      const contentSuggestions = await Content.findAll({
        where: {
          title: { [Op.like]: `%${searchTerm}%` },
          audit_status: "approved",
        },
        attributes: ["title"],
        limit: suggestionLimit / 2,
        order: [["view_count", "DESC"]],
      });

      // 获取标签建议
      const tagSuggestions = await Tag.findAll({
        where: {
          name: { [Op.like]: `%${searchTerm}%` },
        },
        attributes: ["name"],
        limit: suggestionLimit / 2,
        order: [["usage_count", "DESC"]],
      });

      // 合并建议
      const suggestions = [
        ...contentSuggestions.map((item) => ({ type: "content", text: item.title })),
        ...tagSuggestions.map((item) => ({ type: "tag", text: item.name })),
      ];

      // 去重并限制数量
      const uniqueSuggestions = suggestions
        .filter((item, index, self) => self.findIndex((s) => s.text === item.text) === index)
        .slice(0, suggestionLimit);

      sendResponse(
        res,
        {
          query: searchTerm,
          suggestions: uniqueSuggestions,
        },
        "获取搜索建议成功"
      );
    } catch (error) {
      logger.error("获取搜索建议失败:", error);
      sendError(res, "获取搜索建议失败");
    }
  }

  /**
   * 热门搜索
   * GET /api/search/trending
   */
  async getTrendingSearches(req, res) {
    try {
      const { limit = 10 } = req.query;
      const trendingLimit = Math.min(20, Math.max(1, parseInt(limit)));

      // 获取热门标签
      const hotTags = await Tag.findAll({
        attributes: ["name", "usage_count"],
        where: {
          usage_count: { [Op.gt]: 0 },
        },
        order: [["usage_count", "DESC"]],
        limit: trendingLimit,
      });

      // 获取热门内容标题
      const hotContents = await Content.findAll({
        attributes: ["title", "view_count"],
        where: {
          audit_status: "approved",
          view_count: { [Op.gt]: 0 },
        },
        order: [["view_count", "DESC"]],
        limit: trendingLimit,
      });

      sendResponse(
        res,
        {
          hot_tags: hotTags,
          hot_contents: hotContents.map((item) => ({
            title: item.title,
            views: item.view_count,
          })),
        },
        "获取热门搜索成功"
      );
    } catch (error) {
      logger.error("获取热门搜索失败:", error);
      sendError(res, "获取热门搜索失败");
    }
  }

  /**
   * 按分类搜索
   * GET /api/search/category/:categoryId
   */
  async searchByCategory(req, res) {
    try {
      const { categoryId } = req.params;
      const {
        q: query,
        page = 1,
        limit = 20,
        sort_by = "created_at",
        sort_order = "DESC",
      } = req.query;

      // 验证分类是否存在
      const category = await Category.findByPk(categoryId);
      if (!category) {
        return sendError(res, "分类不存在", 404);
      }

      // 构建查询条件
      const whereConditions = {
        category_id: categoryId,
        audit_status: "approved",
      };

      if (query && query.trim().length > 0) {
        whereConditions[Op.or] = [
          { title: { [Op.like]: `%${query}%` } },
          { summary: { [Op.like]: `%${query}%` } },
          { content: { [Op.like]: `%${query}%` } },
        ];
      }

      // 分页设置
      const pageNum = Math.max(1, parseInt(page));
      const pageSize = Math.min(50, Math.max(1, parseInt(limit)));
      const offset = (pageNum - 1) * pageSize;

      // 排序设置
      const validSortFields = ["created_at", "updated_at", "view_count", "like_count"];
      const sortField = validSortFields.includes(sort_by) ? sort_by : "created_at";
      const sortDirection = sort_order.toUpperCase() === "ASC" ? "ASC" : "DESC";

      const { count, rows: contents } = await Content.findAndCountAll({
        where: whereConditions,
        include: [
          { model: User, as: "author", attributes: ["id", "nickname", "avatar"] },
          {
            model: Tag,
            as: "tags",
            attributes: ["id", "name", "slug"],
            through: { attributes: [] },
          },
        ],
        order: [[sortField, sortDirection]],
        limit: pageSize,
        offset,
        distinct: true,
      });

      // 分页信息
      const pagination = {
        current_page: pageNum,
        total_pages: Math.ceil(count / pageSize),
        total_items: count,
        items_per_page: pageSize,
        has_next: pageNum < Math.ceil(count / pageSize),
        has_prev: pageNum > 1,
      };

      sendResponse(
        res,
        {
          category,
          query: query || "",
          contents,
          pagination,
        },
        "分类搜索完成"
      );
    } catch (error) {
      logger.error("分类搜索失败:", error);
      sendError(res, "分类搜索失败");
    }
  }

  /**
   * 按标签搜索
   * GET /api/search/tag/:tagId
   */
  async searchByTag(req, res) {
    try {
      const { tagId } = req.params;
      const { page = 1, limit = 20, sort_by = "created_at", sort_order = "DESC" } = req.query;

      // 验证标签是否存在
      const tag = await Tag.findByPk(tagId);
      if (!tag) {
        return sendError(res, "标签不存在", 404);
      }

      // 分页设置
      const pageNum = Math.max(1, parseInt(page));
      const pageSize = Math.min(50, Math.max(1, parseInt(limit)));
      const offset = (pageNum - 1) * pageSize;

      // 排序设置
      const validSortFields = ["created_at", "updated_at", "view_count", "like_count"];
      const sortField = validSortFields.includes(sort_by) ? sort_by : "created_at";
      const sortDirection = sort_order.toUpperCase() === "ASC" ? "ASC" : "DESC";

      const { count, rows: contents } = await Content.findAndCountAll({
        where: { audit_status: "approved" },
        include: [
          { model: User, as: "author", attributes: ["id", "nickname", "avatar"] },
          { model: Category, as: "category", attributes: ["id", "name", "slug"] },
          {
            model: Tag,
            as: "tags",
            attributes: ["id", "name", "slug"],
            through: { attributes: [] },
            where: { id: tagId },
            required: true,
          },
        ],
        order: [[sortField, sortDirection]],
        limit: pageSize,
        offset,
        distinct: true,
      });

      // 分页信息
      const pagination = {
        current_page: pageNum,
        total_pages: Math.ceil(count / pageSize),
        total_items: count,
        items_per_page: pageSize,
        has_next: pageNum < Math.ceil(count / pageSize),
        has_prev: pageNum > 1,
      };

      sendResponse(
        res,
        {
          tag,
          contents,
          pagination,
        },
        "标签搜索完成"
      );
    } catch (error) {
      logger.error("标签搜索失败:", error);
      sendError(res, "标签搜索失败");
    }
  }
}

module.exports = new SearchController();
