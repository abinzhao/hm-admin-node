const nodemailer = require("nodemailer");
const fs = require("fs").promises;
const path = require("path");
const logger = require("../utils/logger");

class EmailService {
  constructor() {
    this.transporter = null;
    this.init();
  }

  // 初始化邮件发送器
  async init() {
    try {
      // 检查环境变量配置
      if (!process.env.MAIL_HOST || !process.env.MAIL_USER || !process.env.MAIL_PASS) {
        logger.warn("邮件服务配置不完整，将禁用邮件发送功能");
        logger.info("请配置以下环境变量启用邮件服务：MAIL_HOST, MAIL_USER, MAIL_PASS");
        this.transporter = null;
        return;
      }

      this.transporter = nodemailer.createTransporter({
        host: process.env.MAIL_HOST,
        port: process.env.MAIL_PORT || 587,
        secure: process.env.MAIL_SECURE === "true",
        auth: {
          user: process.env.MAIL_USER,
          pass: process.env.MAIL_PASS,
        },
        pool: true, // 启用连接池
        maxConnections: 5,
        maxMessages: 100,
      });

      // 验证邮件配置
      await this.transporter.verify();
      logger.info("✅ 邮件服务初始化成功");
    } catch (error) {
      logger.warn("⚠️ 邮件服务初始化失败，将禁用邮件发送功能:", error.message);
      this.transporter = null;
    }
  }

  // 加载邮件模板
  async loadTemplate(templateName, variables = {}) {
    try {
      const templatePath = path.join(__dirname, "..", "templates", `${templateName}.html`);
      let template = await fs.readFile(templatePath, "utf8");

      // 替换模板变量
      for (const [key, value] of Object.entries(variables)) {
        const regex = new RegExp(`{{${key}}}`, "g");
        template = template.replace(regex, value);
      }

      return template;
    } catch (error) {
      logger.error(`加载邮件模板失败: ${templateName}`, error);
      return null;
    }
  }

  // 发送邮件的通用方法
  async sendMail(options) {
    if (!this.transporter) {
      logger.debug("邮件服务未启用，跳过邮件发送:", options.subject);
      return { success: false, message: "邮件服务未启用" };
    }

    const mailOptions = {
      from: {
        name: process.env.MAIL_FROM_NAME || "HM程序员社区",
        address: process.env.MAIL_FROM_ADDRESS || process.env.MAIL_USER,
      },
      to: options.to,
      subject: options.subject,
      html: options.html,
      text: options.text,
      attachments: options.attachments,
    };

    try {
      const info = await this.transporter.sendMail(mailOptions);
      logger.info(`邮件发送成功: ${options.to}`, {
        messageId: info.messageId,
        subject: options.subject,
      });
      return { success: true, messageId: info.messageId };
    } catch (error) {
      logger.error(`邮件发送失败: ${options.to}`, error);
      throw error;
    }
  }

  // 发送验证码邮件
  async sendVerificationCode(email, code, type = "register") {
    const templates = {
      register: "注册验证码",
      reset: "重置密码验证码",
      change: "邮箱变更验证码",
    };

    const subject = templates[type] || "验证码";

    const html = await this.loadTemplate("verification-code", {
      code,
      type_text: subject,
      valid_minutes: 5,
      app_name: "程序员社区",
      app_url: process.env.APP_URL,
    });

    return this.sendMail({
      to: email,
      subject: `【HM程序员社区】${subject}`,
      html,
    });
  }

  // 发送欢迎邮件
  async sendWelcomeEmail(user) {
    const html = await this.loadTemplate("welcome", {
      nickname: user.nickname,
      email: user.email,
      app_name: "HM程序员社区",
      app_url: process.env.APP_URL,
      dashboard_url: `${process.env.APP_URL}/dashboard`,
      support_email: "support@hmcommunity.com",
    });

    return this.sendMail({
      to: user.email,
      subject: "欢迎加入HM程序员社区！",
      html,
    });
  }

  // 发送密码重置邮件
  async sendPasswordResetEmail(user, resetToken) {
    const resetUrl = `${process.env.APP_URL}/reset-password?token=${resetToken}`;

    const html = await this.loadTemplate("password-reset", {
      nickname: user.nickname,
      reset_url: resetUrl,
      valid_hours: 1,
      app_name: "HM程序员社区",
      app_url: process.env.APP_URL,
    });

    return this.sendMail({
      to: user.email,
      subject: "【HM程序员社区】密码重置",
      html,
    });
  }

  // 发送通知邮件
  async sendNotificationEmail(user, notification) {
    const html = await this.loadTemplate("notification", {
      nickname: user.nickname,
      title: notification.title,
      content: notification.content,
      action_url: notification.target_url || process.env.APP_URL,
      app_name: "HM程序员社区",
      app_url: process.env.APP_URL,
      unsubscribe_url: `${process.env.APP_URL}/unsubscribe?token=${user.id}`,
    });

    return this.sendMail({
      to: user.email,
      subject: `【HM程序员社区】${notification.title}`,
      html,
    });
  }

  // 发送待办提醒邮件
  async sendTodoReminderEmail(user, todo) {
    const dueDate = new Date(todo.due_date).toLocaleString("zh-CN");

    const html = await this.loadTemplate("todo-reminder", {
      nickname: user.nickname,
      todo_title: todo.title,
      todo_description: todo.description || "无描述",
      due_date: dueDate,
      priority: todo.priority,
      todo_url: `${process.env.APP_URL}/todos/${todo.id}`,
      app_name: "HM程序员社区",
      app_url: process.env.APP_URL,
    });

    return this.sendMail({
      to: user.email,
      subject: `【HM程序员社区】待办提醒：${todo.title}`,
      html,
    });
  }

  // 发送团队邀请邮件
  async sendTeamInviteEmail(invitee, team, inviter) {
    const inviteUrl = `${process.env.APP_URL}/teams/${team.id}/join`;

    const html = await this.loadTemplate("team-invite", {
      invitee_name: invitee.nickname,
      team_name: team.name,
      inviter_name: inviter.nickname,
      team_description: team.description || "",
      invite_url: inviteUrl,
      app_name: "HM程序员社区",
      app_url: process.env.APP_URL,
    });

    return this.sendMail({
      to: invitee.email,
      subject: `【HM程序员社区】${inviter.nickname} 邀请您加入团队：${team.name}`,
      html,
    });
  }

  // 发送内容审核结果邮件
  async sendContentAuditEmail(user, content, result, reason = "") {
    const statusText = result === "approved" ? "审核通过" : "审核未通过";
    const contentUrl = `${process.env.APP_URL}/contents/${content.id}`;

    const html = await this.loadTemplate("content-audit", {
      nickname: user.nickname,
      content_title: content.title,
      content_type:
        content.type === "article" ? "文章" : content.type === "question" ? "问答" : "代码片段",
      audit_result: statusText,
      audit_reason: reason,
      content_url: contentUrl,
      app_name: "HM程序员社区",
      app_url: process.env.APP_URL,
    });

    return this.sendMail({
      to: user.email,
      subject: `【HM程序员社区】内容${statusText}：${content.title}`,
      html,
    });
  }

  // 发送举报处理结果邮件
  async sendReportResultEmail(user, report, result) {
    const resultText =
      {
        resolved: "已处理",
        rejected: "已驳回",
      }[result] || "处理中";

    const html = await this.loadTemplate("report-result", {
      nickname: user.nickname,
      report_reason: report.reason,
      report_description: report.description || "",
      result: resultText,
      handler_note: report.handler_note || "",
      app_name: "HM程序员社区",
      app_url: process.env.APP_URL,
    });

    return this.sendMail({
      to: user.email,
      subject: `【HM程序员社区】举报处理结果：${resultText}`,
      html,
    });
  }

  // 批量发送邮件
  async sendBulkEmail(emails, subject, template, variables = {}) {
    const results = [];

    for (const email of emails) {
      try {
        const html = await this.loadTemplate(template, {
          ...variables,
          email,
        });

        const result = await this.sendMail({
          to: email,
          subject,
          html,
        });

        results.push({ email, success: true, messageId: result.messageId });
      } catch (error) {
        results.push({ email, success: false, error: error.message });
      }
    }

    return results;
  }

  // 发送系统通知邮件（给管理员）
  async sendSystemNotificationEmail(title, message, data = {}) {
    const adminEmails = process.env.ADMIN_EMAILS?.split(",") || [];

    if (adminEmails.length === 0) {
      logger.warn("未配置管理员邮箱，无法发送系统通知");
      return;
    }

    const html = await this.loadTemplate("system-notification", {
      title,
      message,
      data: JSON.stringify(data, null, 2),
      timestamp: new Date().toLocaleString("zh-CN"),
      app_name: "HM程序员社区",
      app_url: process.env.APP_URL,
    });

    return this.sendBulkEmail(adminEmails, `【系统通知】${title}`, "system-notification", {
      title,
      message,
      data: JSON.stringify(data, null, 2),
      timestamp: new Date().toLocaleString("zh-CN"),
    });
  }

  // 关闭邮件发送器
  async close() {
    if (this.transporter) {
      this.transporter.close();
      logger.info("邮件服务已关闭");
    }
  }
}

// 创建单例实例
const emailService = new EmailService();

module.exports = emailService;
