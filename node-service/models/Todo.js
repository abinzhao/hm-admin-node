/**
 * Todo模型 - 待办事项管理
 * 支持个人待办、团队任务、项目管理等功能
 */
module.exports = (sequelize, DataTypes) => {
  const Todo = sequelize.define(
    "Todo",
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        comment: "待办事项ID",
      },

      title: {
        type: DataTypes.STRING(200),
        allowNull: false,
        comment: "待办事项标题",
        validate: {
          notEmpty: { msg: "待办事项标题不能为空" },
          len: { args: [1, 200], msg: "标题长度应在1-200字符之间" },
        },
      },

      description: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: "详细描述",
      },

      status: {
        type: DataTypes.ENUM("todo", "in_progress", "completed", "cancelled"),
        defaultValue: "todo",
        comment: "状态：todo-待办, in_progress-进行中, completed-已完成, cancelled-已取消",
      },

      priority: {
        type: DataTypes.ENUM("low", "medium", "high", "urgent"),
        defaultValue: "medium",
        comment: "优先级：low-低, medium-中, high-高, urgent-紧急",
      },

      category: {
        type: DataTypes.STRING(50),
        allowNull: true,
        comment: "分类：work-工作, study-学习, life-生活, project-项目等",
      },

      tags: {
        type: DataTypes.JSON,
        allowNull: true,
        comment: "标签数组，便于分类和搜索",
      },

      due_date: {
        type: DataTypes.DATE,
        allowNull: true,
        comment: "截止日期",
      },

      reminder_at: {
        type: DataTypes.DATE,
        allowNull: true,
        comment: "提醒时间",
      },

      is_reminded: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        comment: "是否已发送提醒",
      },

      progress: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
        comment: "完成进度(0-100)",
        validate: {
          min: { args: [0], msg: "进度不能小于0" },
          max: { args: [100], msg: "进度不能大于100" },
        },
      },

      estimated_hours: {
        type: DataTypes.DECIMAL(5, 2),
        allowNull: true,
        comment: "预估工时(小时)",
      },

      actual_hours: {
        type: DataTypes.DECIMAL(5, 2),
        allowNull: true,
        comment: "实际工时(小时)",
      },

      creator_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: "Users",
          key: "id",
        },
        comment: "创建者ID",
      },

      assignee_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
          model: "Users",
          key: "id",
        },
        comment: "负责人ID",
      },

      project_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        comment: "所属项目ID",
      },

      parent_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
          model: "Todos",
          key: "id",
        },
        comment: "父任务ID，用于子任务",
      },

      order_index: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
        comment: "排序索引",
      },

      is_public: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        comment: "是否公开(团队可见)",
      },

      completed_at: {
        type: DataTypes.DATE,
        allowNull: true,
        comment: "完成时间",
      },

      started_at: {
        type: DataTypes.DATE,
        allowNull: true,
        comment: "开始时间",
      },

      notes: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: "备注信息",
      },

      metadata: {
        type: DataTypes.JSON,
        allowNull: true,
        comment: "扩展元数据",
      },
    },
    {
      tableName: "todos",
      timestamps: true,
      createdAt: "created_at",
      updatedAt: "updated_at",
      paranoid: true,
      deletedAt: "deleted_at",

      indexes: [
        { fields: ["creator_id"] },
        { fields: ["assignee_id"] },
        { fields: ["status"] },
        { fields: ["priority"] },
        { fields: ["due_date"] },
        { fields: ["category"] },
        { fields: ["project_id"] },
        { fields: ["parent_id"] },
        { fields: ["reminder_at"] },
        { fields: ["created_at"] },
      ],

      hooks: {
        beforeUpdate: async (todo, options) => {
          // 状态变更时自动更新时间戳
          if (todo.changed("status")) {
            if (todo.status === "in_progress" && !todo.started_at) {
              todo.started_at = new Date();
            } else if (todo.status === "completed" && !todo.completed_at) {
              todo.completed_at = new Date();
              todo.progress = 100;
            }
          }

          // 进度达到100%时自动标记为完成
          if (todo.changed("progress") && todo.progress === 100 && todo.status !== "completed") {
            todo.status = "completed";
            todo.completed_at = new Date();
          }
        },
      },
    }
  );

  // 定义关联关系
  Todo.associate = function (models) {
    // 创建者关联
    Todo.belongsTo(models.User, {
      foreignKey: "creator_id",
      as: "creator",
      onDelete: "CASCADE",
    });

    // 负责人关联
    Todo.belongsTo(models.User, {
      foreignKey: "assignee_id",
      as: "assignee",
      onDelete: "SET NULL",
    });

    // 父任务关联(自关联)
    Todo.belongsTo(Todo, {
      foreignKey: "parent_id",
      as: "parent",
      onDelete: "CASCADE",
    });

    // 子任务关联
    Todo.hasMany(Todo, {
      foreignKey: "parent_id",
      as: "subtasks",
      onDelete: "CASCADE",
    });

    // 待办评论关联(如果有评论功能)
    if (models.Comment) {
      Todo.hasMany(models.Comment, {
        foreignKey: "target_id",
        scope: { target_type: "todo" },
        as: "comments",
      });
    }

    // 待办附件关联(如果有文件上传功能)
    if (models.FileUpload) {
      Todo.hasMany(models.FileUpload, {
        foreignKey: "related_id",
        scope: { related_type: "todo" },
        as: "attachments",
      });
    }
  };

  // 实例方法
  Todo.prototype.toJSON = function () {
    const values = Object.assign({}, this.get());

    // 计算相对时间
    if (values.due_date) {
      const now = new Date();
      const dueDate = new Date(values.due_date);
      values.is_overdue = dueDate < now && values.status !== "completed";
      values.days_until_due = Math.ceil((dueDate - now) / (1000 * 60 * 60 * 24));
    }

    // 格式化优先级和状态
    values.priority_text = {
      low: "低",
      medium: "中",
      high: "高",
      urgent: "紧急",
    }[values.priority];

    values.status_text = {
      todo: "待办",
      in_progress: "进行中",
      completed: "已完成",
      cancelled: "已取消",
    }[values.status];

    return values;
  };

  // 静态方法
  Todo.findByUser = function (userId, options = {}) {
    return this.findAll({
      where: {
        [require("sequelize").Op.or]: [{ creator_id: userId }, { assignee_id: userId }],
        ...options.where,
      },
      include: [
        { model: require("./User"), as: "creator", attributes: ["id", "nickname", "avatar"] },
        { model: require("./User"), as: "assignee", attributes: ["id", "nickname", "avatar"] },
      ],
      order: [
        ["priority", "DESC"],
        ["due_date", "ASC"],
        ["created_at", "DESC"],
      ],
      ...options,
    });
  };

  Todo.findByProject = function (projectId, options = {}) {
    return this.findAll({
      where: {
        project_id: projectId,
        ...options.where,
      },
      include: [
        { model: require("./User"), as: "creator", attributes: ["id", "nickname", "avatar"] },
        { model: require("./User"), as: "assignee", attributes: ["id", "nickname", "avatar"] },
      ],
      order: [
        ["order_index", "ASC"],
        ["priority", "DESC"],
        ["created_at", "DESC"],
      ],
      ...options,
    });
  };

  Todo.getStatsByUser = async function (userId) {
    const { Op } = require("sequelize");

    const [total, completed, inProgress, overdue] = await Promise.all([
      this.count({
        where: {
          [Op.or]: [{ creator_id: userId }, { assignee_id: userId }],
        },
      }),
      this.count({
        where: {
          [Op.or]: [{ creator_id: userId }, { assignee_id: userId }],
          status: "completed",
        },
      }),
      this.count({
        where: {
          [Op.or]: [{ creator_id: userId }, { assignee_id: userId }],
          status: "in_progress",
        },
      }),
      this.count({
        where: {
          [Op.or]: [{ creator_id: userId }, { assignee_id: userId }],
          status: { [Op.in]: ["todo", "in_progress"] },
          due_date: { [Op.lt]: new Date() },
        },
      }),
    ]);

    return {
      total,
      completed,
      inProgress,
      pending: total - completed - inProgress,
      overdue,
      completionRate: total > 0 ? Math.round((completed / total) * 100) : 0,
    };
  };

  return Todo;
};
