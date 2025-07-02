const { Op } = require("sequelize");
const { Comment, User, Content, Like } = require("../models");
const logger = require("../utils/logger");

class CommentController {
  /**
   * 创建评论
   */
  async createComment(req, res) {
    try {
      const { target_id, target_type, parent_id = 0, content } = req.body;
      const userId = req.user.id;

      // 数据验证
      if (!target_id || !target_type || !content) {
        return res.status(400).json({
          success: false,
          message: "目标ID、目标类型和评论内容不能为空",
        });
      }

      if (!["content", "package"].includes(target_type)) {
        return res.status(400).json({
          success: false,
          message: "目标类型必须是 content 或 package",
        });
      }

      if (content.length > 1000) {
        return res.status(400).json({
          success: false,
          message: "评论内容不能超过1000个字符",
        });
      }

      // 验证目标是否存在
      if (target_type === "content") {
        const targetContent = await Content.findOne({
          where: {
            id: target_id,
            status: "published",
            audit_status: "approved",
          },
        });

        if (!targetContent) {
          return res.status(404).json({
            success: false,
            message: "目标内容不存在或未发布",
          });
        }
      }

      // 验证父评论是否存在（如果是回复）
      let parentComment = null;
      if (parent_id > 0) {
        parentComment = await Comment.findOne({
          where: {
            id: parent_id,
            target_id,
            target_type,
            status: "normal",
          },
        });

        if (!parentComment) {
          return res.status(404).json({
            success: false,
            message: "父评论不存在",
          });
        }
      }

      // 创建评论
      const comment = await Comment.create({
        user_id: userId,
        target_id,
        target_type,
        parent_id,
        content,
        ip_address: req.ip,
        user_agent: req.get("User-Agent"),
      });

      // 更新父评论回复数
      if (parentComment) {
        await parentComment.increment("reply_count");
      }

      // 更新目标的评论数
      if (target_type === "content") {
        await Content.increment("comment_count", { where: { id: target_id } });
      }

      // 获取完整的评论信息
      const commentWithDetails = await Comment.findByPk(comment.id, {
        include: [
          {
            model: User,
            as: "author",
            attributes: ["id", "nickname", "avatar", "level"],
          },
        ],
      });

      // 创建通知（如果是回复其他人的评论）
      if (parentComment && parentComment.user_id !== userId) {
        await this.createCommentNotification(parentComment, commentWithDetails, "reply");
      }

      // 如果是评论内容，通知内容作者
      if (target_type === "content") {
        const targetContent = await Content.findByPk(target_id);
        if (targetContent && targetContent.user_id !== userId) {
          await this.createCommentNotification(targetContent, commentWithDetails, "comment");
        }
      }

      res.status(201).json({
        success: true,
        message: "评论发布成功",
        data: commentWithDetails,
      });
    } catch (error) {
      logger.error("创建评论失败:", error);
      res.status(500).json({
        success: false,
        message: "评论发布失败，请稍后重试",
      });
    }
  }

  /**
   * 获取评论列表
   */
  async getComments(req, res) {
    try {
      const {
        target_id,
        target_type,
        parent_id = 0,
        page = 1,
        limit = 20,
        sort = "latest",
      } = req.query;

      if (!target_id || !target_type) {
        return res.status(400).json({
          success: false,
          message: "目标ID和目标类型不能为空",
        });
      }

      const offset = (parseInt(page) - 1) * parseInt(limit);

      // 构建查询条件
      const whereClause = {
        target_id: parseInt(target_id),
        target_type,
        parent_id: parseInt(parent_id),
        status: "normal",
      };

      // 排序配置
      const orderMapping = {
        latest: [["created_at", "DESC"]],
        oldest: [["created_at", "ASC"]],
        popular: [
          ["like_count", "DESC"],
          ["created_at", "DESC"],
        ],
      };

      const order = orderMapping[sort] || orderMapping.latest;

      const { count: total, rows: comments } = await Comment.findAndCountAll({
        where: whereClause,
        include: [
          {
            model: User,
            as: "author",
            attributes: ["id", "nickname", "avatar", "level"],
          },
        ],
        order,
        limit: parseInt(limit),
        offset,
      });

      // 获取用户点赞状态（如果已登录）
      if (req.user) {
        for (const comment of comments) {
          comment.dataValues.isLiked = await Like.isLiked(req.user.id, "comment", comment.id);
        }
      }

      res.status(200).json({
        success: true,
        data: {
          comments,
          pagination: {
            current: parseInt(page),
            total: Math.ceil(total / parseInt(limit)),
            count: total,
            per_page: parseInt(limit),
          },
        },
      });
    } catch (error) {
      logger.error("获取评论列表失败:", error);
      res.status(500).json({
        success: false,
        message: "获取评论列表失败",
      });
    }
  }

  /**
   * 更新评论
   */
  async updateComment(req, res) {
    try {
      const { id } = req.params;
      const { content } = req.body;
      const userId = req.user.id;

      if (!content || content.trim().length === 0) {
        return res.status(400).json({
          success: false,
          message: "评论内容不能为空",
        });
      }

      if (content.length > 1000) {
        return res.status(400).json({
          success: false,
          message: "评论内容不能超过1000个字符",
        });
      }

      const comment = await Comment.findByPk(id);

      if (!comment) {
        return res.status(404).json({
          success: false,
          message: "评论不存在",
        });
      }

      // 权限检查：只有评论作者或管理员可以编辑
      if (comment.user_id !== userId && req.user.role !== "admin") {
        return res.status(403).json({
          success: false,
          message: "没有权限编辑此评论",
        });
      }

      await comment.update({ content });

      const updatedComment = await Comment.findByPk(id, {
        include: [
          {
            model: User,
            as: "author",
            attributes: ["id", "nickname", "avatar", "level"],
          },
        ],
      });

      res.status(200).json({
        success: true,
        message: "评论更新成功",
        data: updatedComment,
      });
    } catch (error) {
      logger.error("更新评论失败:", error);
      res.status(500).json({
        success: false,
        message: "更新评论失败",
      });
    }
  }

  /**
   * 删除评论
   */
  async deleteComment(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user.id;

      const comment = await Comment.findByPk(id);

      if (!comment) {
        return res.status(404).json({
          success: false,
          message: "评论不存在",
        });
      }

      // 权限检查：只有评论作者或管理员可以删除
      if (comment.user_id !== userId && req.user.role !== "admin") {
        return res.status(403).json({
          success: false,
          message: "没有权限删除此评论",
        });
      }

      // 软删除
      await comment.update({ status: "deleted" });

      // 更新父评论回复数
      if (comment.parent_id > 0) {
        await Comment.decrement("reply_count", { where: { id: comment.parent_id } });
      }

      // 更新目标的评论数
      if (comment.target_type === "content") {
        await Content.decrement("comment_count", { where: { id: comment.target_id } });
      }

      res.status(200).json({
        success: true,
        message: "评论删除成功",
      });
    } catch (error) {
      logger.error("删除评论失败:", error);
      res.status(500).json({
        success: false,
        message: "删除评论失败",
      });
    }
  }

  /**
   * 点赞/取消点赞评论
   */
  async toggleCommentLike(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user.id;

      const comment = await Comment.findOne({
        where: {
          id,
          status: "normal",
        },
      });

      if (!comment) {
        return res.status(404).json({
          success: false,
          message: "评论不存在",
        });
      }

      const result = await Like.toggle(userId, "comment", comment.id);

      res.status(200).json({
        success: true,
        message: result.action === "liked" ? "点赞成功" : "取消点赞成功",
        data: result,
      });
    } catch (error) {
      logger.error("评论点赞操作失败:", error);
      res.status(500).json({
        success: false,
        message: "操作失败",
      });
    }
  }

  /**
   * 创建评论通知
   */
  async createCommentNotification(target, comment, type) {
    try {
      const { Notification } = require("../models");

      let notificationData;

      if (type === "comment") {
        // 评论内容通知
        notificationData = {
          user_id: target.user_id,
          type: "content_comment",
          title: "收到新评论",
          content: `${comment.author.nickname} 评论了您的内容《${target.title}》`,
          data: JSON.stringify({
            content_id: target.id,
            content_title: target.title,
            comment_id: comment.id,
            commenter_id: comment.user_id,
            commenter_name: comment.author.nickname,
          }),
        };
      } else if (type === "reply") {
        // 回复评论通知
        notificationData = {
          user_id: target.user_id,
          type: "comment_reply",
          title: "收到新回复",
          content: `${comment.author.nickname} 回复了您的评论`,
          data: JSON.stringify({
            parent_comment_id: target.id,
            reply_comment_id: comment.id,
            replier_id: comment.user_id,
            replier_name: comment.author.nickname,
          }),
        };
      }

      if (notificationData) {
        await Notification.create(notificationData);
      }
    } catch (error) {
      logger.error("创建评论通知失败:", error);
    }
  }
}

module.exports = new CommentController();
