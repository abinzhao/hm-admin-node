const { FileUpload, User } = require("../models");
const { Op } = require("sequelize");
const logger = require("../utils/logger");
const { sendResponse, sendError } = require("../utils/helpers");
const { detectFileType, cleanupTempFiles } = require("../middlewares/upload");
const path = require("path");
const fs = require("fs").promises;
const crypto = require("crypto");

/**
 * 文件上传控制器
 * 处理文件上传、管理、下载等功能
 */
class UploadController {
  /**
   * 上传文件
   * POST /api/upload
   */
  async uploadFiles(req, res) {
    try {
      const userId = req.user.id;
      const { related_type, related_id, is_public = false } = req.body;

      if (!req.files || req.files.length === 0) {
        return sendError(res, "没有选择要上传的文件", 400);
      }

      const uploadedFiles = [];
      const errors = [];

      // 处理每个上传的文件
      for (const file of req.files) {
        try {
          // 检测文件类型
          const fileTypeInfo = detectFileType(file.originalname);
          if (!fileTypeInfo) {
            errors.push(`不支持的文件类型: ${file.originalname}`);
            continue;
          }

          // 计算文件哈希值
          const fileBuffer = await fs.readFile(file.path);
          const hash = crypto.createHash("sha256").update(fileBuffer).digest("hex");

          // 检查是否存在相同文件
          const existingFile = await FileUpload.findOne({
            where: {
              hash,
              uploader_id: userId,
              status: "completed",
            },
          });

          if (existingFile) {
            // 删除重复文件
            await fs.unlink(file.path);
            uploadedFiles.push(existingFile);
            continue;
          }

          // 生成文件URL
          const baseUrl = process.env.APP_URL || "http://localhost:3001";
          const relativePath = path.relative(process.cwd(), file.path).replace(/\\/g, "/");
          const fileUrl = `${baseUrl}/${relativePath}`;

          // 创建文件记录
          const fileRecord = await FileUpload.create({
            original_name: file.originalname,
            file_name: file.filename,
            file_path: file.path,
            file_url: fileUrl,
            file_type: fileTypeInfo.type,
            mime_type: file.mimetype,
            file_size: file.size,
            extension: path.extname(file.originalname).toLowerCase(),
            uploader_id: userId,
            related_type: related_type || "temp",
            related_id: related_id || null,
            is_public: is_public === "true" || is_public === true,
            hash,
            upload_ip: req.ip,
            user_agent: req.get("User-Agent"),
            // 临时文件7天后过期
            expires_at:
              related_type === "temp" ? new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) : null,
          });

          uploadedFiles.push(fileRecord);

          logger.info(`用户 ${userId} 上传文件: ${file.originalname}`);
        } catch (error) {
          logger.error(`处理文件失败: ${file.originalname}`, error);
          errors.push(`处理文件失败: ${file.originalname}`);

          // 清理失败的文件
          try {
            await fs.unlink(file.path);
          } catch (cleanupError) {
            logger.error("清理失败文件出错:", cleanupError);
          }
        }
      }

      // 响应结果
      const response = {
        files: uploadedFiles,
        uploaded_count: uploadedFiles.length,
        total_count: req.files.length,
      };

      if (errors.length > 0) {
        response.errors = errors;
      }

      const message =
        errors.length > 0
          ? `部分文件上传成功，${uploadedFiles.length}/${req.files.length}个文件成功上传`
          : `成功上传 ${uploadedFiles.length} 个文件`;

      sendResponse(res, response, message, errors.length > 0 ? 207 : 200);
    } catch (error) {
      logger.error("文件上传失败:", error);

      // 清理上传的文件
      if (req.files) {
        cleanupTempFiles(req.files);
      }

      sendError(res, "文件上传失败");
    }
  }

  /**
   * 获取文件列表
   * GET /api/upload/files
   */
  async getFiles(req, res) {
    try {
      const userId = req.user.id;
      const {
        page = 1,
        limit = 20,
        file_type,
        related_type,
        search,
        sort_by = "created_at",
        sort_order = "DESC",
      } = req.query;

      // 构建查询条件
      const whereConditions = {
        uploader_id: userId,
        status: "completed",
      };

      if (file_type) {
        whereConditions.file_type = file_type;
      }

      if (related_type) {
        whereConditions.related_type = related_type;
      }

      if (search) {
        whereConditions[Op.or] = [
          { original_name: { [Op.like]: `%${search}%` } },
          { file_name: { [Op.like]: `%${search}%` } },
        ];
      }

      // 排序设置
      const validSortFields = ["created_at", "updated_at", "original_name", "file_size"];
      const sortField = validSortFields.includes(sort_by) ? sort_by : "created_at";
      const sortDirection = sort_order.toUpperCase() === "ASC" ? "ASC" : "DESC";

      // 分页设置
      const pageNum = Math.max(1, parseInt(page));
      const pageSize = Math.min(100, Math.max(1, parseInt(limit)));
      const offset = (pageNum - 1) * pageSize;

      // 查询数据
      const { count, rows: files } = await FileUpload.findAndCountAll({
        where: whereConditions,
        include: [{ model: User, as: "uploader", attributes: ["id", "nickname", "avatar"] }],
        order: [[sortField, sortDirection]],
        limit: pageSize,
        offset: offset,
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
          files,
          pagination,
        },
        "获取文件列表成功"
      );
    } catch (error) {
      logger.error("获取文件列表失败:", error);
      sendError(res, "获取文件列表失败");
    }
  }

  /**
   * 获取文件详情
   * GET /api/upload/files/:id
   */
  async getFileById(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user.id;

      const file = await FileUpload.findOne({
        where: {
          id,
          [Op.or]: [{ uploader_id: userId }, { is_public: true }],
          status: "completed",
        },
        include: [{ model: User, as: "uploader", attributes: ["id", "nickname", "avatar"] }],
      });

      if (!file) {
        return sendError(res, "文件不存在或没有权限查看", 404);
      }

      // 检查权限
      const canEdit = file.uploader_id === userId || req.user.role === "admin";
      const canDelete = file.uploader_id === userId || req.user.role === "admin";

      const responseData = {
        ...file.toJSON(),
        permissions: {
          can_edit: canEdit,
          can_delete: canDelete,
          can_download: true,
        },
      };

      sendResponse(res, { file: responseData }, "获取文件详情成功");
    } catch (error) {
      logger.error("获取文件详情失败:", error);
      sendError(res, "获取文件详情失败");
    }
  }

  /**
   * 更新文件信息
   * PUT /api/upload/files/:id
   */
  async updateFile(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user.id;
      const { original_name, related_type, related_id, is_public } = req.body;

      const file = await FileUpload.findByPk(id);
      if (!file) {
        return sendError(res, "文件不存在", 404);
      }

      // 权限检查
      if (file.uploader_id !== userId && req.user.role !== "admin") {
        return sendError(res, "没有权限编辑此文件", 403);
      }

      // 更新数据
      const updateData = {};
      if (original_name !== undefined) updateData.original_name = original_name;
      if (related_type !== undefined) updateData.related_type = related_type;
      if (related_id !== undefined) updateData.related_id = related_id;
      if (is_public !== undefined) updateData.is_public = is_public;

      await file.update(updateData);

      logger.info(`用户 ${userId} 更新了文件 ${id}`);

      sendResponse(res, { file }, "文件信息更新成功");
    } catch (error) {
      logger.error("更新文件信息失败:", error);
      sendError(res, "更新文件信息失败");
    }
  }

  /**
   * 删除文件
   * DELETE /api/upload/files/:id
   */
  async deleteFile(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user.id;

      const file = await FileUpload.findByPk(id);
      if (!file) {
        return sendError(res, "文件不存在", 404);
      }

      // 权限检查
      if (file.uploader_id !== userId && req.user.role !== "admin") {
        return sendError(res, "没有权限删除此文件", 403);
      }

      // 删除物理文件
      try {
        await fs.unlink(file.file_path);
        if (file.thumbnail_path) {
          await fs.unlink(file.thumbnail_path);
        }
      } catch (fsError) {
        logger.warn("删除物理文件失败:", fsError);
      }

      // 软删除记录
      await file.destroy();

      logger.info(`用户 ${userId} 删除了文件 ${id}`);

      sendResponse(res, null, "文件删除成功");
    } catch (error) {
      logger.error("删除文件失败:", error);
      sendError(res, "删除文件失败");
    }
  }

  /**
   * 下载文件
   * GET /api/upload/files/:id/download
   */
  async downloadFile(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user?.id;

      const file = await FileUpload.findOne({
        where: {
          id,
          status: "completed",
        },
      });

      if (!file) {
        return sendError(res, "文件不存在", 404);
      }

      // 权限检查
      if (!file.is_public && (!userId || file.uploader_id !== userId)) {
        return sendError(res, "没有权限下载此文件", 403);
      }

      // 检查文件是否存在
      try {
        await fs.access(file.file_path);
      } catch (error) {
        return sendError(res, "文件不存在或已损坏", 404);
      }

      // 增加下载计数
      await file.increment("download_count");

      // 设置响应头
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="${encodeURIComponent(file.original_name)}"`
      );
      res.setHeader("Content-Type", file.mime_type);

      // 发送文件
      res.sendFile(path.resolve(file.file_path), (err) => {
        if (err) {
          logger.error("文件下载失败:", err);
          if (!res.headersSent) {
            sendError(res, "文件下载失败");
          }
        } else {
          logger.info(`文件下载成功: ${file.original_name}`);
        }
      });
    } catch (error) {
      logger.error("处理文件下载失败:", error);
      sendError(res, "文件下载失败");
    }
  }

  /**
   * 获取用户存储统计
   * GET /api/upload/stats
   */
  async getStorageStats(req, res) {
    try {
      const userId = req.user.id;

      const stats = await FileUpload.getStorageStats(userId);

      sendResponse(res, stats, "获取存储统计成功");
    } catch (error) {
      logger.error("获取存储统计失败:", error);
      sendError(res, "获取存储统计失败");
    }
  }

  /**
   * 批量删除文件
   * POST /api/upload/batch-delete
   */
  async batchDeleteFiles(req, res) {
    try {
      const userId = req.user.id;
      const { file_ids } = req.body;

      if (!Array.isArray(file_ids) || file_ids.length === 0) {
        return sendError(res, "请选择要删除的文件", 400);
      }

      // 查找文件
      const files = await FileUpload.findAll({
        where: {
          id: { [Op.in]: file_ids },
          uploader_id: userId,
          status: "completed",
        },
      });

      if (files.length === 0) {
        return sendError(res, "没有找到可删除的文件", 404);
      }

      let deletedCount = 0;
      const errors = [];

      // 批量删除
      for (const file of files) {
        try {
          // 删除物理文件
          try {
            await fs.unlink(file.file_path);
            if (file.thumbnail_path) {
              await fs.unlink(file.thumbnail_path);
            }
          } catch (fsError) {
            logger.warn(`删除物理文件失败: ${file.file_path}`, fsError);
          }

          // 软删除记录
          await file.destroy();
          deletedCount++;
        } catch (error) {
          logger.error(`删除文件失败: ${file.id}`, error);
          errors.push(`删除文件失败: ${file.original_name}`);
        }
      }

      logger.info(`用户 ${userId} 批量删除了 ${deletedCount} 个文件`);

      const response = {
        deleted_count: deletedCount,
        total_count: files.length,
      };

      if (errors.length > 0) {
        response.errors = errors;
      }

      sendResponse(res, response, `成功删除 ${deletedCount} 个文件`);
    } catch (error) {
      logger.error("批量删除文件失败:", error);
      sendError(res, "批量删除文件失败");
    }
  }

  /**
   * 获取文件类型配置
   * GET /api/upload/config
   */
  async getUploadConfig(req, res) {
    try {
      const { getFileTypeConfig } = require("../middlewares/upload");
      const config = getFileTypeConfig();

      sendResponse(
        res,
        {
          file_types: config,
          max_files_per_upload: 20,
          max_total_size: 100 * 1024 * 1024, // 100MB
        },
        "获取上传配置成功"
      );
    } catch (error) {
      logger.error("获取上传配置失败:", error);
      sendError(res, "获取上传配置失败");
    }
  }

  /**
   * 上传头像
   * POST /api/upload/avatar
   */
  async uploadAvatar(req, res) {
    try {
      const userId = req.user.id;

      if (!req.file) {
        return sendError(res, "没有选择头像文件", 400);
      }

      const file = req.file;

      // 计算文件哈希值
      const fileBuffer = await fs.readFile(file.path);
      const hash = crypto.createHash("sha256").update(fileBuffer).digest("hex");

      // 生成文件URL
      const baseUrl = process.env.APP_URL || "http://localhost:3001";
      const relativePath = path.relative(process.cwd(), file.path).replace(/\\/g, "/");
      const fileUrl = `${baseUrl}/${relativePath}`;

      // 创建文件记录
      const fileRecord = await FileUpload.create({
        original_name: file.originalname,
        file_name: file.filename,
        file_path: file.path,
        file_url: fileUrl,
        file_type: "image",
        mime_type: file.mimetype,
        file_size: file.size,
        extension: path.extname(file.originalname).toLowerCase(),
        uploader_id: userId,
        related_type: "user_avatar",
        related_id: userId,
        is_public: true,
        hash,
        upload_ip: req.ip,
        user_agent: req.get("User-Agent"),
      });

      // 更新用户头像
      await User.update({ avatar: fileUrl }, { where: { id: userId } });

      logger.info(`用户 ${userId} 上传了新头像`);

      sendResponse(
        res,
        {
          file: fileRecord,
          avatar_url: fileUrl,
        },
        "头像上传成功"
      );
    } catch (error) {
      logger.error("头像上传失败:", error);

      // 清理上传的文件
      if (req.file) {
        cleanupTempFiles(req.file);
      }

      sendError(res, "头像上传失败");
    }
  }
}

module.exports = new UploadController();
