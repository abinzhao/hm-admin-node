const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { v4: uuidv4 } = require("uuid");
const { Op } = require("sequelize");
const { User, OAuthAccount } = require("../models");
const { sendEmail } = require("../services/emailService");
const { validation } = require("../utils/validation");
const logger = require("../utils/logger");
const thirdPartyAuthService = require("../services/thirdPartyAuthService");
const smsService = require("../services/smsService");

// JWT配置
const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key";
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "7d";
const REFRESH_TOKEN_EXPIRES_IN = process.env.REFRESH_TOKEN_EXPIRES_IN || "30d";

class AuthController {
  /**
   * 用户注册
   */
  async register(req, res) {
    try {
      const { username, email, password, nickname, phone } = req.body;

      // 数据验证
      const errors = [];
      if (!username || username.length < 3 || username.length > 50) {
        errors.push("用户名长度必须在3-50个字符之间");
      }
      if (!validation.isEmail(email)) {
        errors.push("邮箱格式不正确");
      }
      if (!validation.isStrongPassword(password)) {
        errors.push("密码必须包含至少8个字符，包括大小写字母和数字");
      }
      if (!validation.isNickname(nickname)) {
        errors.push("昵称长度必须在2-20个字符之间");
      }
      if (phone && !validation.isPhone(phone)) {
        errors.push("手机号格式不正确");
      }

      if (errors.length > 0) {
        return res.status(400).json({
          success: false,
          message: "数据验证失败",
          errors,
        });
      }

      // 检查用户名、邮箱和昵称是否已存在
      const existingUser = await User.findOne({
        where: {
          [Op.or]: [{ username }, { email }, { nickname }, ...(phone ? [{ phone }] : [])],
        },
      });

      if (existingUser) {
        if (existingUser.username === username) {
          return res.status(400).json({
            success: false,
            message: "用户名已被注册",
          });
        }
        if (existingUser.email === email) {
          return res.status(400).json({
            success: false,
            message: "邮箱已被注册",
          });
        }
        if (existingUser.nickname === nickname) {
          return res.status(400).json({
            success: false,
            message: "昵称已被使用",
          });
        }
        if (phone && existingUser.phone === phone) {
          return res.status(400).json({
            success: false,
            message: "手机号已被注册",
          });
        }
      }

      // 直接创建用户（简化流程，不需要邮箱验证）
      const user = await User.create({
        username,
        email,
        password, // 会被模型的beforeCreate钩子自动加密
        nickname,
        phone: phone || null,
        email_verified: false, // 可以后续添加邮箱验证功能
        last_login_ip: req.ip,
        last_login_at: new Date(),
      });

      // 生成Token
      const tokens = this.generateTokens(user.id);

      // 发送欢迎邮件（可选）
      try {
        await sendEmail({
          to: user.email,
          subject: "欢迎加入HM程序员社区",
          template: "welcome",
          data: {
            nickname: user.nickname,
          },
        });
      } catch (emailError) {
        logger.warn("欢迎邮件发送失败:", emailError.message);
        // 邮件发送失败不影响注册流程
      }

      res.status(201).json({
        success: true,
        message: "注册成功",
        data: {
          user: user.toSafeJSON(),
          ...tokens,
        },
      });
    } catch (error) {
      logger.error("用户注册失败:", error);
      logger.error("注册错误详情:", {
        username: req.body.username,
        email: req.body.email,
        error: error.message,
        stack: error.stack,
      });
      res.status(500).json({
        success: false,
        message: "注册失败，请稍后重试",
        ...(process.env.NODE_ENV === "development" && { debug: error.message }),
      });
    }
  }

  /**
   * 用户登录
   */
  async login(req, res) {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return res.status(400).json({
          success: false,
          message: "邮箱和密码不能为空",
        });
      }

      // 查找用户
      const user = await User.findOne({
        where: { email },
      });

      if (!user) {
        return res.status(401).json({
          success: false,
          message: "邮箱或密码错误",
        });
      }

      // 检查用户状态
      if (user.status === "banned") {
        return res.status(403).json({
          success: false,
          message: "账户已被封禁",
        });
      }

      if (user.status === "inactive") {
        return res.status(403).json({
          success: false,
          message: "账户未激活",
        });
      }

      // 验证密码
      const isPasswordValid = await bcrypt.compare(password, user.password);
      if (!isPasswordValid) {
        return res.status(401).json({
          success: false,
          message: "邮箱或密码错误",
        });
      }

      // 更新登录信息
      await user.update({
        last_login_at: new Date(),
        last_login_ip: req.ip,
      });

      // 生成Token
      const tokens = this.generateTokens(user.id);

      res.status(200).json({
        success: true,
        message: "登录成功",
        data: {
          user: user.toSafeJSON(),
          ...tokens,
        },
      });
    } catch (error) {
      logger.error("用户登录失败:", error);
      logger.error("登录错误详情:", {
        email: req.body.email,
        error: error.message,
        stack: error.stack,
      });
      res.status(500).json({
        success: false,
        message: "登录失败，请稍后重试",
        ...(process.env.NODE_ENV === "development" && { debug: error.message }),
      });
    }
  }

  /**
   * 刷新Token
   */
  async refreshToken(req, res) {
    try {
      const { refreshToken } = req.body;

      if (!refreshToken) {
        return res.status(400).json({
          success: false,
          message: "Refresh token 不能为空",
        });
      }

      // 验证refresh token
      let decoded;
      try {
        decoded = jwt.verify(refreshToken, JWT_SECRET);
      } catch (error) {
        return res.status(401).json({
          success: false,
          message: "Refresh token 无效",
        });
      }

      // 检查用户是否存在
      const user = await User.findByPk(decoded.userId);
      if (!user || user.status !== "active") {
        return res.status(401).json({
          success: false,
          message: "用户不存在或已被禁用",
        });
      }

      // 生成新的Token
      const tokens = this.generateTokens(user.id);

      res.status(200).json({
        success: true,
        message: "Token刷新成功",
        data: tokens,
      });
    } catch (error) {
      logger.error("Token刷新失败:", error);
      res.status(500).json({
        success: false,
        message: "Token刷新失败",
      });
    }
  }

  /**
   * 用户登出
   */
  async logout(req, res) {
    try {
      // 简化版本：客户端删除token即可
      // 在无状态JWT架构中，服务端不需要存储token状态
      res.status(200).json({
        success: true,
        message: "登出成功",
      });
    } catch (error) {
      logger.error("用户登出失败:", error);
      res.status(500).json({
        success: false,
        message: "登出失败",
      });
    }
  }

  /**
   * 忘记密码（简化版本）
   */
  async forgotPassword(req, res) {
    try {
      const { email } = req.body;

      if (!validation.isEmail(email)) {
        return res.status(400).json({
          success: false,
          message: "邮箱格式不正确",
        });
      }

      const user = await User.findOne({ where: { email } });
      if (!user) {
        // 为了安全，即使用户不存在也返回成功
        return res.status(200).json({
          success: true,
          message: "如果该邮箱已注册，您将收到重置密码的邮件",
        });
      }

      // 生成重置密码token（包含用户ID和过期时间）
      const resetToken = jwt.sign({ userId: user.id, type: "password_reset" }, JWT_SECRET, {
        expiresIn: "30m",
      });

      // 发送重置密码邮件
      try {
        await sendEmail({
          to: user.email,
          subject: "HM程序员社区 - 重置密码",
          template: "password-reset",
          data: {
            nickname: user.nickname,
            resetToken,
            resetUrl: `${process.env.FRONTEND_URL || "http://localhost:3001"}/reset-password?token=${resetToken}`,
          },
        });
      } catch (emailError) {
        logger.warn("重置密码邮件发送失败:", emailError.message);
      }

      res.status(200).json({
        success: true,
        message: "如果该邮箱已注册，您将收到重置密码的邮件",
      });
    } catch (error) {
      logger.error("忘记密码处理失败:", error);
      res.status(500).json({
        success: false,
        message: "处理失败，请稍后重试",
      });
    }
  }

  /**
   * 重置密码
   */
  async resetPassword(req, res) {
    try {
      const { token, newPassword } = req.body;

      if (!token || !newPassword) {
        return res.status(400).json({
          success: false,
          message: "Token和新密码不能为空",
        });
      }

      if (!validation.isStrongPassword(newPassword)) {
        return res.status(400).json({
          success: false,
          message: "密码必须包含至少8个字符，包括大小写字母和数字",
        });
      }

      // 验证重置token
      let decoded;
      try {
        decoded = jwt.verify(token, JWT_SECRET);
        if (decoded.type !== "password_reset") {
          throw new Error("Invalid token type");
        }
      } catch (error) {
        return res.status(400).json({
          success: false,
          message: "重置链接无效或已过期",
        });
      }

      // 查找用户
      const user = await User.findByPk(decoded.userId);
      if (!user) {
        return res.status(400).json({
          success: false,
          message: "用户不存在",
        });
      }

      // 更新密码（会被模型的beforeUpdate钩子自动加密）
      await user.update({ password: newPassword });

      // 发送密码重置成功邮件
      try {
        await sendEmail({
          to: user.email,
          subject: "HM程序员社区 - 密码重置成功",
          template: "password-reset-success",
          data: {
            nickname: user.nickname,
          },
        });
      } catch (emailError) {
        logger.warn("密码重置成功邮件发送失败:", emailError.message);
      }

      res.status(200).json({
        success: true,
        message: "密码重置成功",
      });
    } catch (error) {
      logger.error("重置密码失败:", error);
      res.status(500).json({
        success: false,
        message: "重置密码失败，请稍后重试",
      });
    }
  }

  /**
   * 修改密码
   */
  async changePassword(req, res) {
    try {
      const { currentPassword, newPassword } = req.body;
      const userId = req.user.id;

      if (!currentPassword || !newPassword) {
        return res.status(400).json({
          success: false,
          message: "当前密码和新密码不能为空",
        });
      }

      if (!validation.isStrongPassword(newPassword)) {
        return res.status(400).json({
          success: false,
          message: "新密码必须包含至少8个字符，包括大小写字母和数字",
        });
      }

      const user = await User.findByPk(userId);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: "用户不存在",
        });
      }

      // 验证当前密码
      const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password);
      if (!isCurrentPasswordValid) {
        return res.status(400).json({
          success: false,
          message: "当前密码不正确",
        });
      }

      // 更新密码
      const hashedPassword = await bcrypt.hash(newPassword, 12);
      await user.update({ password: hashedPassword });

      res.status(200).json({
        success: true,
        message: "密码修改成功",
      });
    } catch (error) {
      logger.error("修改密码失败:", error);
      res.status(500).json({
        success: false,
        message: "修改密码失败，请稍后重试",
      });
    }
  }

  /**
   * 获取当前用户信息
   */
  async getProfile(req, res) {
    try {
      const userId = req.user.id;

      const user = await User.findByPk(userId, {
        include: [
          {
            model: OAuthAccount,
            as: "oauthAccounts",
            attributes: ["provider", "provider_name", "created_at"],
          },
        ],
      });

      if (!user) {
        return res.status(404).json({
          success: false,
          message: "用户不存在",
        });
      }

      res.status(200).json({
        success: true,
        data: user.toSafeJSON(),
      });
    } catch (error) {
      logger.error("获取用户信息失败:", error);
      res.status(500).json({
        success: false,
        message: "获取用户信息失败",
      });
    }
  }

  // ========== 第三方登录 ==========

  /**
   * 获取第三方登录授权URL
   */
  async getOAuthUrl(req, res) {
    try {
      const { provider } = req.params;
      const { state } = req.query;

      let authUrl;
      try {
        switch (provider) {
          case "wechat":
            authUrl = thirdPartyAuthService.getWechatAuthUrl(state);
            break;
          case "qq":
            authUrl = thirdPartyAuthService.getQQAuthUrl(state);
            break;
          case "weibo":
            authUrl = thirdPartyAuthService.getWeiboAuthUrl(state);
            break;
          default:
            return res.status(400).json({
              success: false,
              message: "不支持的第三方登录方式",
            });
        }

        res.status(200).json({
          success: true,
          data: {
            authUrl,
            provider,
            state,
          },
        });
      } catch (error) {
        return res.status(400).json({
          success: false,
          message: error.message,
        });
      }
    } catch (error) {
      logger.error("获取第三方登录URL失败:", error);
      res.status(500).json({
        success: false,
        message: "获取授权URL失败",
      });
    }
  }

  /**
   * 第三方登录回调
   */
  async oauthCallback(req, res) {
    try {
      const { provider } = req.params;
      const { code, state } = req.query;

      if (!code) {
        return res.status(400).json({
          success: false,
          message: "缺少授权码",
        });
      }

      let result;
      try {
        switch (provider) {
          case "wechat":
            result = await thirdPartyAuthService.handleWechatLogin(code, state);
            break;
          case "qq":
            result = await thirdPartyAuthService.handleQQLogin(code, state);
            break;
          case "weibo":
            result = await thirdPartyAuthService.handleWeiboLogin(code, state);
            break;
          default:
            return res.status(400).json({
              success: false,
              message: "不支持的第三方登录方式",
            });
        }
      } catch (authError) {
        return res.status(400).json({
          success: false,
          message: authError.message,
        });
      }

      // 更新用户登录信息
      await result.user.update({
        last_login_at: new Date(),
        last_login_ip: req.ip,
      });

      // 生成Token
      const tokens = this.generateTokens(result.user.id);

      res.status(200).json({
        success: true,
        message: result.isNewUser ? "注册并登录成功" : "登录成功",
        data: {
          user: result.user.toSafeJSON(),
          isNewUser: result.isNewUser,
          provider,
          ...tokens,
        },
      });
    } catch (error) {
      logger.error("第三方登录回调失败:", error);
      res.status(500).json({
        success: false,
        message: "第三方登录失败",
      });
    }
  }

  /**
   * 绑定第三方账户
   */
  async bindOAuthAccount(req, res) {
    try {
      const { provider } = req.params;
      const { code, state } = req.body;
      const userId = req.user.id;

      if (!code) {
        return res.status(400).json({
          success: false,
          message: "缺少授权码",
        });
      }

      // 先获取第三方用户信息
      let oauthData;
      try {
        switch (provider) {
          case "wechat":
            const wechatResult = await thirdPartyAuthService.handleWechatLogin(code, state);
            oauthData = {
              provider_id: wechatResult.oauthAccount.provider_id,
              provider_data: wechatResult.oauthAccount.provider_data,
              access_token: wechatResult.oauthAccount.access_token,
              refresh_token: wechatResult.oauthAccount.refresh_token,
            };
            break;
          case "qq":
            const qqResult = await thirdPartyAuthService.handleQQLogin(code, state);
            oauthData = {
              provider_id: qqResult.oauthAccount.provider_id,
              provider_data: qqResult.oauthAccount.provider_data,
              access_token: qqResult.oauthAccount.access_token,
              refresh_token: qqResult.oauthAccount.refresh_token,
            };
            break;
          case "weibo":
            const weiboResult = await thirdPartyAuthService.handleWeiboLogin(code, state);
            oauthData = {
              provider_id: weiboResult.oauthAccount.provider_id,
              provider_data: weiboResult.oauthAccount.provider_data,
              access_token: weiboResult.oauthAccount.access_token,
            };
            break;
          default:
            return res.status(400).json({
              success: false,
              message: "不支持的第三方登录方式",
            });
        }
      } catch (authError) {
        return res.status(400).json({
          success: false,
          message: authError.message,
        });
      }

      // 绑定到当前用户
      try {
        const oauthAccount = await thirdPartyAuthService.bindOAuthAccount(
          userId,
          provider,
          oauthData
        );

        res.status(200).json({
          success: true,
          message: "绑定成功",
          data: {
            provider,
            nickname: oauthAccount.provider_data?.nickname || oauthAccount.provider_data?.name,
            avatar: oauthAccount.provider_data?.avatar,
          },
        });
      } catch (bindError) {
        return res.status(400).json({
          success: false,
          message: bindError.message,
        });
      }
    } catch (error) {
      logger.error("绑定第三方账户失败:", error);
      res.status(500).json({
        success: false,
        message: "绑定失败",
      });
    }
  }

  /**
   * 解绑第三方账户
   */
  async unbindOAuthAccount(req, res) {
    try {
      const { provider } = req.params;
      const userId = req.user.id;

      await thirdPartyAuthService.unbindOAuthAccount(userId, provider);

      res.status(200).json({
        success: true,
        message: "解绑成功",
      });
    } catch (error) {
      logger.error("解绑第三方账户失败:", error);
      res.status(500).json({
        success: false,
        message: error.message || "解绑失败",
      });
    }
  }

  /**
   * 获取用户绑定的第三方账户列表
   */
  async getOAuthAccounts(req, res) {
    try {
      const userId = req.user.id;
      const accounts = await thirdPartyAuthService.getUserOAuthAccounts(userId);

      res.status(200).json({
        success: true,
        data: accounts,
      });
    } catch (error) {
      logger.error("获取第三方账户列表失败:", error);
      res.status(500).json({
        success: false,
        message: "获取账户列表失败",
      });
    }
  }

  // ========== 短信验证码登录 ==========

  /**
   * 发送短信验证码
   */
  async sendSmsCode(req, res) {
    try {
      const { phone, type = "login" } = req.body;

      if (!phone) {
        return res.status(400).json({
          success: false,
          message: "手机号不能为空",
        });
      }

      // 验证手机号格式
      if (!validation.isPhone(phone)) {
        return res.status(400).json({
          success: false,
          message: "手机号格式不正确",
        });
      }

      // 对于登录类型，检查手机号是否已注册
      if (type === "login") {
        const user = await User.findOne({ where: { phone } });
        if (!user) {
          return res.status(400).json({
            success: false,
            message: "该手机号未注册",
          });
        }
      }

      // 对于注册类型，检查手机号是否已注册
      if (type === "register") {
        const user = await User.findOne({ where: { phone } });
        if (user) {
          return res.status(400).json({
            success: false,
            message: "该手机号已注册",
          });
        }
      }

      const result = await smsService.sendVerificationCode(phone, type);

      res.status(200).json({
        success: true,
        message: result.message,
        data: {
          expireMinutes: result.expireMinutes,
          requestId: result.requestId,
        },
      });
    } catch (error) {
      logger.error("发送短信验证码失败:", error);
      res.status(500).json({
        success: false,
        message: error.message || "发送失败",
      });
    }
  }

  /**
   * 短信验证码登录
   */
  async smsLogin(req, res) {
    try {
      const { phone, code } = req.body;

      if (!phone || !code) {
        return res.status(400).json({
          success: false,
          message: "手机号和验证码不能为空",
        });
      }

      // 验证验证码
      const verifyResult = await smsService.verifyCode(phone, code, "login");
      if (!verifyResult.success) {
        return res.status(400).json({
          success: false,
          message: verifyResult.message,
        });
      }

      // 查找用户
      const user = await User.findOne({ where: { phone } });
      if (!user) {
        return res.status(400).json({
          success: false,
          message: "该手机号未注册",
        });
      }

      // 检查用户状态
      if (user.status === "banned") {
        return res.status(403).json({
          success: false,
          message: "账户已被封禁",
        });
      }

      if (user.status === "inactive") {
        return res.status(403).json({
          success: false,
          message: "账户未激活",
        });
      }

      // 更新登录信息
      await user.update({
        last_login_at: new Date(),
        last_login_ip: req.ip,
      });

      // 生成Token
      const tokens = this.generateTokens(user.id);

      res.status(200).json({
        success: true,
        message: "登录成功",
        data: {
          user: user.toSafeJSON(),
          ...tokens,
        },
      });
    } catch (error) {
      logger.error("短信验证码登录失败:", error);
      res.status(500).json({
        success: false,
        message: "登录失败",
      });
    }
  }

  /**
   * 手机号注册
   */
  async smsRegister(req, res) {
    try {
      const { phone, code, nickname, password } = req.body;

      // 验证必填字段
      if (!phone || !code || !nickname) {
        return res.status(400).json({
          success: false,
          message: "手机号、验证码和昵称不能为空",
        });
      }

      // 验证验证码
      const verifyResult = await smsService.verifyCode(phone, code, "register");
      if (!verifyResult.success) {
        return res.status(400).json({
          success: false,
          message: verifyResult.message,
        });
      }

      // 验证昵称
      if (!validation.isNickname(nickname)) {
        return res.status(400).json({
          success: false,
          message: "昵称长度必须在2-20个字符之间",
        });
      }

      // 验证密码（如果提供）
      if (password && !validation.isStrongPassword(password)) {
        return res.status(400).json({
          success: false,
          message: "密码必须包含至少8个字符，包括大小写字母和数字",
        });
      }

      // 检查手机号和昵称是否已被使用
      const existingUser = await User.findOne({
        where: {
          [Op.or]: [{ phone }, { nickname }],
        },
      });

      if (existingUser) {
        if (existingUser.phone === phone) {
          return res.status(400).json({
            success: false,
            message: "该手机号已注册",
          });
        }
        if (existingUser.nickname === nickname) {
          return res.status(400).json({
            success: false,
            message: "昵称已被使用",
          });
        }
      }

      // 创建用户
      const user = await User.create({
        username: `user_${Date.now()}`, // 自动生成用户名
        nickname,
        phone,
        password: password || null, // 如果没有密码，可以后续设置
        email: null, // 手机注册时邮箱为空
        email_verified: false,
        phone_verified: true, // 通过验证码验证的手机号认为已验证
        last_login_ip: req.ip,
        last_login_at: new Date(),
      });

      // 生成Token
      const tokens = this.generateTokens(user.id);

      res.status(201).json({
        success: true,
        message: "注册成功",
        data: {
          user: user.toSafeJSON(),
          ...tokens,
        },
      });
    } catch (error) {
      logger.error("手机号注册失败:", error);
      res.status(500).json({
        success: false,
        message: "注册失败",
      });
    }
  }

  /**
   * 绑定手机号
   */
  async bindPhone(req, res) {
    try {
      const { phone, code } = req.body;
      const userId = req.user.id;

      if (!phone || !code) {
        return res.status(400).json({
          success: false,
          message: "手机号和验证码不能为空",
        });
      }

      // 验证验证码
      const verifyResult = await smsService.verifyCode(phone, code, "bind_phone");
      if (!verifyResult.success) {
        return res.status(400).json({
          success: false,
          message: verifyResult.message,
        });
      }

      // 检查手机号是否已被其他用户使用
      const existingUser = await User.findOne({
        where: {
          phone,
          id: { [Op.ne]: userId },
        },
      });

      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: "该手机号已被其他用户绑定",
        });
      }

      // 更新用户手机号
      const user = await User.findByPk(userId);
      await user.update({
        phone,
        phone_verified: true,
      });

      res.status(200).json({
        success: true,
        message: "手机号绑定成功",
        data: {
          phone: user.phone,
        },
      });
    } catch (error) {
      logger.error("绑定手机号失败:", error);
      res.status(500).json({
        success: false,
        message: "绑定失败",
      });
    }
  }

  /**
   * 生成访问令牌和刷新令牌
   */
  generateTokens(userId) {
    // 生成访问令牌
    const accessToken = jwt.sign({ userId, type: "access" }, JWT_SECRET, {
      expiresIn: JWT_EXPIRES_IN,
    });

    // 生成刷新令牌
    const refreshToken = jwt.sign({ userId, type: "refresh" }, JWT_SECRET, {
      expiresIn: REFRESH_TOKEN_EXPIRES_IN,
    });

    return {
      accessToken,
      refreshToken,
      expiresIn: JWT_EXPIRES_IN,
    };
  }
}

module.exports = new AuthController();
