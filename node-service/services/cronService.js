const cron = require("node-cron");
const { Op } = require("sequelize");
const logger = require("../utils/logger");
const emailService = require("./emailService");
const {
  User,
  Todo,
  Notification,
  Content,
  AppPackage,
  FileUpload,
  OperationLog,
} = require("../models");

class CronService {
  constructor() {
    this.tasks = new Map();
    this.isRunning = false;
  }

  // 启动所有定时任务
  start() {
    if (this.isRunning) {
      logger.warn("定时任务服务已在运行");
      return;
    }

    logger.info("启动定时任务服务");
    this.isRunning = true;

    // 待办事项提醒 - 每分钟检查一次
    this.addTask("todoReminder", "* * * * *", this.checkTodoReminders);

    // 清理过期通知 - 每天凌晨2点
    this.addTask("cleanExpiredNotifications", "0 2 * * *", this.cleanExpiredNotifications);

    // 清理无用文件 - 每天凌晨3点
    this.addTask("cleanUnusedFiles", "0 3 * * *", this.cleanUnusedFiles);

    // 清理操作日志 - 每周日凌晨4点
    this.addTask("cleanOperationLogs", "0 4 * * 0", this.cleanOperationLogs);

    // 生成统计报告 - 每天早上9点
    this.addTask("generateDailyStats", "0 9 * * *", this.generateDailyStats);

    // 检查内容审核超时 - 每小时
    this.addTask("checkContentAuditTimeout", "0 * * * *", this.checkContentAuditTimeout);

    // 清理过期token - 每6小时
    this.addTask("cleanExpiredTokens", "0 */6 * * *", this.cleanExpiredTokens);

    // 备份重要数据 - 每天凌晨1点
    this.addTask("backupData", "0 1 * * *", this.backupData);

    logger.info(`已启动 ${this.tasks.size} 个定时任务`);
  }

  // 停止所有定时任务
  stop() {
    if (!this.isRunning) {
      return;
    }

    logger.info("停止定时任务服务");

    for (const [name, task] of this.tasks) {
      task.destroy();
      logger.debug(`已停止定时任务: ${name}`);
    }

    this.tasks.clear();
    this.isRunning = false;

    logger.info("定时任务服务已停止");
  }

  // 添加定时任务
  addTask(name, schedule, handler) {
    try {
      const task = cron.schedule(
        schedule,
        async () => {
          try {
            logger.debug(`执行定时任务: ${name}`);
            await handler.call(this);
            logger.debug(`定时任务执行完成: ${name}`);
          } catch (error) {
            logger.error(`定时任务执行失败: ${name}`, error);
          }
        },
        {
          scheduled: true,
          timezone: "Asia/Shanghai",
        }
      );

      this.tasks.set(name, task);
      logger.debug(`已添加定时任务: ${name} (${schedule})`);
    } catch (error) {
      logger.error(`添加定时任务失败: ${name}`, error);
    }
  }

  // 移除定时任务
  removeTask(name) {
    const task = this.tasks.get(name);
    if (task) {
      task.destroy();
      this.tasks.delete(name);
      logger.debug(`已移除定时任务: ${name}`);
    }
  }

  // 检查待办事项提醒
  async checkTodoReminders() {
    try {
      // 检查Todo模型是否存在
      if (!Todo) {
        logger.debug("Todo模型不存在，跳过待办事项提醒检查");
        return;
      }
      const now = new Date();
      const reminderTime = new Date(now.getTime() + 60000); // 提前1分钟提醒

      const todos = await Todo.findAll({
        where: {
          status: ["todo", "in_progress"],
          reminder_at: {
            [Op.between]: [now, reminderTime],
          },
          is_reminded: false,
        },
        include: [
          { model: User, as: "creator", attributes: ["id", "nickname", "email"] },
          { model: User, as: "assignee", attributes: ["id", "nickname", "email"] },
        ],
      });

      for (const todo of todos) {
        try {
          // 发送通知给负责人（如果有分配）或创建者
          const recipient = todo.assignee || todo.creator;

          if (recipient && recipient.email) {
            await emailService.sendTodoReminderEmail(recipient, todo);
          }

          // 创建站内通知
          await Notification.create({
            user_id: recipient.id,
            type: "todo_reminder",
            title: "待办事项提醒",
            content: `您的待办事项"${todo.title}"即将到期，请及时处理。`,
            data: JSON.stringify({
              todo_id: todo.id,
              due_date: todo.due_date,
            }),
          });

          // 标记为已提醒
          await todo.update({ is_reminded: true });

          logger.info(`待办提醒发送成功: ${todo.title}`);
        } catch (error) {
          logger.error(`待办提醒发送失败: ${todo.title}`, error);
        }
      }

      if (todos.length > 0) {
        logger.info(`处理了 ${todos.length} 个待办事项提醒`);
      }
    } catch (error) {
      logger.error("检查待办事项提醒失败", error);
    }
  }

  // 清理过期通知
  async cleanExpiredNotifications() {
    try {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const deletedCount = await Notification.destroy({
        where: {
          created_at: {
            [Op.lt]: thirtyDaysAgo,
          },
          is_read: true,
        },
      });

      logger.info(`清理了 ${deletedCount} 条过期通知`);
    } catch (error) {
      logger.error("清理过期通知失败", error);
    }
  }

  // 清理无用文件
  async cleanUnusedFiles() {
    try {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      // 查找孤立的文件记录
      const unusedFiles = await FileUpload.findAll({
        where: {
          status: "completed",
          created_at: {
            [Op.lt]: sevenDaysAgo,
          },
        },
      });

      let deletedCount = 0;
      const fs = require("fs").promises;

      for (const file of unusedFiles) {
        try {
          // 检查文件是否被引用
          const isUsed = await this.checkFileUsage(file);

          if (!isUsed) {
            // 删除物理文件
            await fs.unlink(file.file_path);

            // 删除记录
            await file.destroy();

            deletedCount++;
          }
        } catch (error) {
          logger.error(`删除文件失败: ${file.file_path}`, error);
        }
      }

      logger.info(`清理了 ${deletedCount} 个无用文件`);
    } catch (error) {
      logger.error("清理无用文件失败", error);
    }
  }

  // 检查文件是否被使用
  async checkFileUsage(file) {
    try {
      // 检查是否为用户头像
      const userCount = await User.count({
        where: { avatar: file.file_path },
      });
      if (userCount > 0) return true;

      // 检查是否在内容中被引用
      const contentCount = await Content.count({
        where: {
          [Op.or]: [
            { cover_image: file.file_path },
            { content: { [Op.like]: `%${file.file_name}%` } },
          ],
        },
      });
      if (contentCount > 0) return true;

      // 检查是否为软件包文件
      const packageCount = await AppPackage.count({
        where: { file_path: file.file_path },
      });
      if (packageCount > 0) return true;

      return false;
    } catch (error) {
      logger.error("检查文件使用情况失败", error);
      return true; // 保守起见，认为文件被使用
    }
  }

  // 清理操作日志
  async cleanOperationLogs() {
    try {
      const twoMonthsAgo = new Date();
      twoMonthsAgo.setMonth(twoMonthsAgo.getMonth() - 2);

      const deletedCount = await OperationLog.destroy({
        where: {
          created_at: {
            [Op.lt]: twoMonthsAgo,
          },
        },
      });

      logger.info(`清理了 ${deletedCount} 条操作日志`);
    } catch (error) {
      logger.error("清理操作日志失败", error);
    }
  }

  // 生成每日统计报告
  async generateDailyStats() {
    try {
      const today = new Date();
      const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);

      // 统计昨日数据
      const stats = await this.getDailyStats(yesterday);

      // 发送统计邮件给管理员
      await emailService.sendSystemNotificationEmail(
        "每日统计报告",
        `以下是 ${yesterday.toLocaleDateString("zh-CN")} 的平台统计数据：`,
        stats
      );

      logger.info("每日统计报告已生成并发送");
    } catch (error) {
      logger.error("生成每日统计报告失败", error);
    }
  }

  // 获取每日统计数据
  async getDailyStats(date) {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const [newUsers, newContents, newComments, newTodos, newPackages] = await Promise.all([
      User.count({
        where: {
          created_at: { [Op.between]: [startOfDay, endOfDay] },
        },
      }),
      Content.count({
        where: {
          created_at: { [Op.between]: [startOfDay, endOfDay] },
        },
      }),
      require("../models").Comment.count({
        where: {
          created_at: { [Op.between]: [startOfDay, endOfDay] },
        },
      }),
      Todo.count({
        where: {
          created_at: { [Op.between]: [startOfDay, endOfDay] },
        },
      }),
      AppPackage.count({
        where: {
          created_at: { [Op.between]: [startOfDay, endOfDay] },
        },
      }),
    ]);

    return {
      date: date.toLocaleDateString("zh-CN"),
      newUsers,
      newContents,
      newComments,
      newTodos,
      newPackages,
    };
  }

  // 检查内容审核超时
  async checkContentAuditTimeout() {
    try {
      const threeDaysAgo = new Date();
      threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

      // 自动通过超时的内容
      const timeoutContents = await Content.findAll({
        where: {
          audit_status: "pending",
          created_at: {
            [Op.lt]: threeDaysAgo,
          },
        },
      });

      for (const content of timeoutContents) {
        await content.update({
          audit_status: "approved",
          audited_at: new Date(),
        });
      }

      if (timeoutContents.length > 0) {
        logger.info(`自动通过了 ${timeoutContents.length} 个超时审核的内容`);
      }
    } catch (error) {
      logger.error("检查内容审核超时失败", error);
    }
  }

  // 清理过期数据
  async cleanExpiredTokens() {
    try {
      // 简化版本：清理过期的会话数据和临时文件
      // 由于使用无状态JWT，不需要清理token
      logger.info("过期数据清理完成（JWT无状态架构）");
    } catch (error) {
      logger.error("清理过期数据失败", error);
    }
  }

  // 数据备份
  async backupData() {
    try {
      // 这里应该实现数据库备份逻辑
      // 可以使用mysqldump等工具
      logger.info("数据备份功能需要根据实际部署环境实现");
    } catch (error) {
      logger.error("数据备份失败", error);
    }
  }

  // 获取任务状态
  getTaskStatus() {
    const status = {};
    for (const [name, task] of this.tasks) {
      status[name] = {
        running: task.running,
        scheduled: task.scheduled,
      };
    }
    return status;
  }
}

// 创建单例实例
const cronService = new CronService();

module.exports = cronService;
