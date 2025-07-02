/**
 * FileUpload模型 - 文件上传记录
 * 记录所有上传文件的信息和状态
 */
module.exports = (sequelize, DataTypes) => {
  const FileUpload = sequelize.define(
    "FileUpload",
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        comment: "文件ID",
      },

      original_name: {
        type: DataTypes.STRING(255),
        allowNull: false,
        comment: "原始文件名",
      },

      file_name: {
        type: DataTypes.STRING(255),
        allowNull: false,
        comment: "存储文件名",
      },

      file_path: {
        type: DataTypes.STRING(500),
        allowNull: false,
        comment: "文件存储路径",
      },

      file_url: {
        type: DataTypes.STRING(500),
        allowNull: true,
        comment: "文件访问URL",
      },

      file_type: {
        type: DataTypes.ENUM("image", "document", "code", "archive", "video", "audio", "other"),
        allowNull: false,
        comment: "文件类型分类",
      },

      mime_type: {
        type: DataTypes.STRING(100),
        allowNull: false,
        comment: "MIME类型",
      },

      file_size: {
        type: DataTypes.BIGINT,
        allowNull: false,
        comment: "文件大小(字节)",
      },

      extension: {
        type: DataTypes.STRING(20),
        allowNull: false,
        comment: "文件扩展名",
      },

      uploader_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: "Users",
          key: "id",
        },
        comment: "上传者ID",
      },

      related_type: {
        type: DataTypes.ENUM("content", "comment", "user_avatar", "todo", "message", "temp"),
        allowNull: true,
        comment: "关联类型",
      },

      related_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        comment: "关联对象ID",
      },

      status: {
        type: DataTypes.ENUM("uploading", "completed", "failed", "deleted"),
        defaultValue: "completed",
        comment: "文件状态",
      },

      is_public: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        comment: "是否公开访问",
      },

      download_count: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
        comment: "下载次数",
      },

      hash: {
        type: DataTypes.STRING(64),
        allowNull: true,
        comment: "文件哈希值(用于去重)",
      },

      thumbnail_path: {
        type: DataTypes.STRING(500),
        allowNull: true,
        comment: "缩略图路径(图片/视频)",
      },

      metadata: {
        type: DataTypes.JSON,
        allowNull: true,
        comment: "文件元数据(分辨率、时长等)",
      },

      upload_ip: {
        type: DataTypes.STRING(45),
        allowNull: true,
        comment: "上传IP地址",
      },

      user_agent: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: "上传时的User-Agent",
      },

      expires_at: {
        type: DataTypes.DATE,
        allowNull: true,
        comment: "过期时间(临时文件)",
      },
    },
    {
      tableName: "file_uploads",
      timestamps: true,
      createdAt: "created_at",
      updatedAt: "updated_at",
      paranoid: true,
      deletedAt: "deleted_at",

      indexes: [
        { fields: ["uploader_id"] },
        { fields: ["file_type"] },
        { fields: ["related_type", "related_id"] },
        { fields: ["status"] },
        { fields: ["hash"] },
        { fields: ["created_at"] },
        { fields: ["expires_at"] },
      ],

      hooks: {
        beforeCreate: async (fileUpload, options) => {
          // 自动生成文件URL
          if (!fileUpload.file_url) {
            const baseUrl = process.env.APP_URL || "http://localhost:3001";
            fileUpload.file_url = `${baseUrl}/uploads/${fileUpload.file_path.replace(/\\/g, "/")}`;
          }
        },
      },
    }
  );

  // 定义关联关系
  FileUpload.associate = function (models) {
    // 上传者关联
    FileUpload.belongsTo(models.User, {
      foreignKey: "uploader_id",
      as: "uploader",
      onDelete: "CASCADE",
    });

    // 内容关联
    if (models.Content) {
      FileUpload.hasMany(models.Content, {
        foreignKey: "cover_image",
        sourceKey: "file_url",
        as: "contentCovers",
      });
    }
  };

  // 实例方法
  FileUpload.prototype.toJSON = function () {
    const values = Object.assign({}, this.get());

    // 格式化文件大小
    values.formatted_size = this.formatFileSize(values.file_size);

    // 计算相对时间
    const now = new Date();
    const createdAt = new Date(values.created_at);
    const diffInHours = (now - createdAt) / (1000 * 60 * 60);

    if (diffInHours < 24) {
      values.uploaded_time_ago = `${Math.floor(diffInHours)}小时前`;
    } else {
      const diffInDays = Math.floor(diffInHours / 24);
      values.uploaded_time_ago = `${diffInDays}天前`;
    }

    // 安全处理敏感信息
    delete values.upload_ip;
    delete values.user_agent;

    return values;
  };

  // 格式化文件大小
  FileUpload.prototype.formatFileSize = function (bytes) {
    if (bytes === 0) return "0 B";

    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB", "TB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  // 静态方法
  FileUpload.findByUser = function (userId, options = {}) {
    return this.findAll({
      where: {
        uploader_id: userId,
        status: "completed",
        ...options.where,
      },
      include: [
        { model: require("./User"), as: "uploader", attributes: ["id", "nickname", "avatar"] },
      ],
      order: [["created_at", "DESC"]],
      ...options,
    });
  };

  FileUpload.findByType = function (fileType, options = {}) {
    return this.findAll({
      where: {
        file_type: fileType,
        status: "completed",
        ...options.where,
      },
      include: [
        { model: require("./User"), as: "uploader", attributes: ["id", "nickname", "avatar"] },
      ],
      order: [["created_at", "DESC"]],
      ...options,
    });
  };

  FileUpload.findByRelated = function (relatedType, relatedId, options = {}) {
    return this.findAll({
      where: {
        related_type: relatedType,
        related_id: relatedId,
        status: "completed",
        ...options.where,
      },
      include: [
        { model: require("./User"), as: "uploader", attributes: ["id", "nickname", "avatar"] },
      ],
      order: [["created_at", "ASC"]],
      ...options,
    });
  };

  // 获取用户存储统计
  FileUpload.getStorageStats = async function (userId) {
    const { Op } = require("sequelize");

    const stats = await this.findAll({
      where: {
        uploader_id: userId,
        status: "completed",
      },
      attributes: [
        "file_type",
        [require("sequelize").fn("COUNT", "*"), "count"],
        [require("sequelize").fn("SUM", require("sequelize").col("file_size")), "total_size"],
      ],
      group: ["file_type"],
      raw: true,
    });

    const totalStats = await this.findOne({
      where: {
        uploader_id: userId,
        status: "completed",
      },
      attributes: [
        [require("sequelize").fn("COUNT", "*"), "total_files"],
        [require("sequelize").fn("SUM", require("sequelize").col("file_size")), "total_size"],
      ],
      raw: true,
    });

    return {
      by_type: stats,
      total: totalStats,
    };
  };

  // 清理过期文件
  FileUpload.cleanupExpiredFiles = async function () {
    const { Op } = require("sequelize");
    const fs = require("fs").promises;

    const expiredFiles = await this.findAll({
      where: {
        expires_at: { [Op.lt]: new Date() },
        status: "completed",
      },
    });

    let deletedCount = 0;

    for (const file of expiredFiles) {
      try {
        // 删除物理文件
        await fs.unlink(file.file_path);

        // 删除缩略图
        if (file.thumbnail_path) {
          await fs.unlink(file.thumbnail_path);
        }

        // 标记为已删除
        await file.update({ status: "deleted" });
        deletedCount++;
      } catch (error) {
        console.error(`删除过期文件失败: ${file.file_path}`, error);
      }
    }

    return deletedCount;
  };

  return FileUpload;
};
