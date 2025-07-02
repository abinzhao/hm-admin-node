/**
 * 第三方认证服务
 * 支持微信、QQ等第三方登录
 */

const axios = require("axios");
const crypto = require("crypto");
const logger = require("../utils/logger");
const { User, OAuthAccount } = require("../models");

class ThirdPartyAuthService {
  constructor() {
    // 微信配置
    this.wechatConfig = {
      appId: process.env.WECHAT_APP_ID,
      appSecret: process.env.WECHAT_APP_SECRET,
      redirectUri: process.env.WECHAT_REDIRECT_URI,
      scope: "snsapi_userinfo",
    };

    // QQ配置
    this.qqConfig = {
      appId: process.env.QQ_APP_ID,
      appKey: process.env.QQ_APP_KEY,
      redirectUri: process.env.QQ_REDIRECT_URI,
      scope: "get_user_info",
    };

    // 微博配置
    this.weiboConfig = {
      appKey: process.env.WEIBO_APP_KEY,
      appSecret: process.env.WEIBO_APP_SECRET,
      redirectUri: process.env.WEIBO_REDIRECT_URI,
      scope: "email",
    };
  }

  /**
   * 获取微信授权URL
   */
  getWechatAuthUrl(state = null) {
    if (!this.wechatConfig.appId) {
      throw new Error("微信App ID未配置");
    }

    const params = new URLSearchParams({
      appid: this.wechatConfig.appId,
      redirect_uri: this.wechatConfig.redirectUri,
      response_type: "code",
      scope: this.wechatConfig.scope,
      state: state || this.generateState(),
    });

    return `https://open.weixin.qq.com/connect/oauth2/authorize?${params.toString()}#wechat_redirect`;
  }

  /**
   * 获取QQ授权URL
   */
  getQQAuthUrl(state = null) {
    if (!this.qqConfig.appId) {
      throw new Error("QQ App ID未配置");
    }

    const params = new URLSearchParams({
      client_id: this.qqConfig.appId,
      redirect_uri: this.qqConfig.redirectUri,
      response_type: "code",
      scope: this.qqConfig.scope,
      state: state || this.generateState(),
    });

    return `https://graph.qq.com/oauth2.0/authorize?${params.toString()}`;
  }

  /**
   * 获取微博授权URL
   */
  getWeiboAuthUrl(state = null) {
    if (!this.weiboConfig.appKey) {
      throw new Error("微博App Key未配置");
    }

    const params = new URLSearchParams({
      client_id: this.weiboConfig.appKey,
      redirect_uri: this.weiboConfig.redirectUri,
      response_type: "code",
      scope: this.weiboConfig.scope,
      state: state || this.generateState(),
    });

    return `https://api.weibo.com/oauth2/authorize?${params.toString()}`;
  }

  /**
   * 微信登录处理
   */
  async handleWechatLogin(code, state) {
    try {
      // 1. 获取access_token
      const tokenResponse = await axios.get("https://api.weixin.qq.com/sns/oauth2/access_token", {
        params: {
          appid: this.wechatConfig.appId,
          secret: this.wechatConfig.appSecret,
          code: code,
          grant_type: "authorization_code",
        },
      });

      const { access_token, openid, refresh_token } = tokenResponse.data;

      if (!access_token || !openid) {
        throw new Error("获取微信访问令牌失败");
      }

      // 2. 获取用户信息
      const userResponse = await axios.get("https://api.weixin.qq.com/sns/userinfo", {
        params: {
          access_token: access_token,
          openid: openid,
          lang: "zh_CN",
        },
      });

      const wechatUser = userResponse.data;

      if (!wechatUser.openid) {
        throw new Error("获取微信用户信息失败");
      }

      // 3. 查找或创建用户
      const result = await this.findOrCreateUser("wechat", {
        provider_id: wechatUser.openid,
        provider_data: {
          unionid: wechatUser.unionid,
          nickname: wechatUser.nickname,
          avatar: wechatUser.headimgurl,
          gender: wechatUser.sex,
          country: wechatUser.country,
          province: wechatUser.province,
          city: wechatUser.city,
        },
        access_token: access_token,
        refresh_token: refresh_token,
      });

      return result;
    } catch (error) {
      logger.error("微信登录失败:", error);
      throw new Error("微信登录失败: " + error.message);
    }
  }

  /**
   * QQ登录处理
   */
  async handleQQLogin(code, state) {
    try {
      // 1. 获取access_token
      const tokenResponse = await axios.get("https://graph.qq.com/oauth2.0/token", {
        params: {
          grant_type: "authorization_code",
          client_id: this.qqConfig.appId,
          client_secret: this.qqConfig.appKey,
          code: code,
          redirect_uri: this.qqConfig.redirectUri,
        },
      });

      // QQ返回的是URL编码格式，需要解析
      const tokenData = new URLSearchParams(tokenResponse.data);
      const access_token = tokenData.get("access_token");
      const refresh_token = tokenData.get("refresh_token");

      if (!access_token) {
        throw new Error("获取QQ访问令牌失败");
      }

      // 2. 获取openid
      const openidResponse = await axios.get("https://graph.qq.com/oauth2.0/me", {
        params: {
          access_token: access_token,
        },
      });

      // 解析JSONP格式响应
      const openidText = openidResponse.data;
      const openidMatch = openidText.match(/openid":"([^"]+)"/);
      if (!openidMatch) {
        throw new Error("获取QQ OpenID失败");
      }
      const openid = openidMatch[1];

      // 3. 获取用户信息
      const userResponse = await axios.get("https://graph.qq.com/user/get_user_info", {
        params: {
          access_token: access_token,
          oauth_consumer_key: this.qqConfig.appId,
          openid: openid,
        },
      });

      const qqUser = userResponse.data;

      if (qqUser.ret !== 0) {
        throw new Error("获取QQ用户信息失败");
      }

      // 4. 查找或创建用户
      const result = await this.findOrCreateUser("qq", {
        provider_id: openid,
        provider_data: {
          nickname: qqUser.nickname,
          avatar: qqUser.figureurl_qq_2 || qqUser.figureurl_qq_1,
          gender: qqUser.gender,
          province: qqUser.province,
          city: qqUser.city,
        },
        access_token: access_token,
        refresh_token: refresh_token,
      });

      return result;
    } catch (error) {
      logger.error("QQ登录失败:", error);
      throw new Error("QQ登录失败: " + error.message);
    }
  }

  /**
   * 微博登录处理
   */
  async handleWeiboLogin(code, state) {
    try {
      // 1. 获取access_token
      const tokenResponse = await axios.post("https://api.weibo.com/oauth2/access_token", {
        client_id: this.weiboConfig.appKey,
        client_secret: this.weiboConfig.appSecret,
        grant_type: "authorization_code",
        code: code,
        redirect_uri: this.weiboConfig.redirectUri,
      });

      const { access_token, uid } = tokenResponse.data;

      if (!access_token || !uid) {
        throw new Error("获取微博访问令牌失败");
      }

      // 2. 获取用户信息
      const userResponse = await axios.get("https://api.weibo.com/2/users/show.json", {
        params: {
          access_token: access_token,
          uid: uid,
        },
      });

      const weiboUser = userResponse.data;

      if (!weiboUser.id) {
        throw new Error("获取微博用户信息失败");
      }

      // 3. 查找或创建用户
      const result = await this.findOrCreateUser("weibo", {
        provider_id: weiboUser.id.toString(),
        provider_data: {
          screen_name: weiboUser.screen_name,
          name: weiboUser.name,
          avatar: weiboUser.avatar_large,
          gender: weiboUser.gender,
          location: weiboUser.location,
          description: weiboUser.description,
          followers_count: weiboUser.followers_count,
          friends_count: weiboUser.friends_count,
        },
        access_token: access_token,
      });

      return result;
    } catch (error) {
      logger.error("微博登录失败:", error);
      throw new Error("微博登录失败: " + error.message);
    }
  }

  /**
   * 查找或创建用户
   */
  async findOrCreateUser(provider, oauthData) {
    try {
      // 查找现有的OAuth账户
      let oauthAccount = await OAuthAccount.findOne({
        where: {
          provider: provider,
          provider_id: oauthData.provider_id,
        },
        include: [
          {
            model: User,
            as: "user",
          },
        ],
      });

      let user;

      if (oauthAccount) {
        // 更新OAuth账户信息
        await oauthAccount.update({
          provider_data: oauthData.provider_data,
          access_token: oauthData.access_token,
          refresh_token: oauthData.refresh_token,
          last_login_at: new Date(),
        });

        user = oauthAccount.user;

        // 更新用户最后登录时间
        await user.update({
          last_login_at: new Date(),
        });
      } else {
        // 创建新用户
        const userData = this.extractUserDataFromProvider(provider, oauthData.provider_data);

        user = await User.create({
          username: userData.username,
          nickname: userData.nickname,
          avatar: userData.avatar,
          email: userData.email,
          gender: userData.gender,
          location: userData.location,
          bio: userData.bio,
          status: "active",
          email_verified: false, // 第三方登录默认邮箱未验证
          last_login_at: new Date(),
        });

        // 创建OAuth账户
        oauthAccount = await OAuthAccount.create({
          user_id: user.id,
          provider: provider,
          provider_id: oauthData.provider_id,
          provider_data: oauthData.provider_data,
          access_token: oauthData.access_token,
          refresh_token: oauthData.refresh_token,
          last_login_at: new Date(),
        });
      }

      return {
        user,
        oauthAccount,
        isNewUser: !oauthAccount.user_id,
      };
    } catch (error) {
      logger.error("查找或创建用户失败:", error);
      throw error;
    }
  }

  /**
   * 从第三方数据提取用户信息
   */
  extractUserDataFromProvider(provider, providerData) {
    const timestamp = Date.now();

    switch (provider) {
      case "wechat":
        return {
          username: `wx_${providerData.openid?.substring(0, 10) || timestamp}`,
          nickname: providerData.nickname || "微信用户",
          avatar: providerData.avatar || null,
          email: null, // 微信不提供邮箱
          gender:
            providerData.gender === 1 ? "male" : providerData.gender === 2 ? "female" : "unknown",
          location: [providerData.country, providerData.province, providerData.city]
            .filter(Boolean)
            .join(" "),
          bio: null,
        };

      case "qq":
        return {
          username: `qq_${timestamp}`,
          nickname: providerData.nickname || "QQ用户",
          avatar: providerData.avatar || null,
          email: null, // QQ需要单独申请邮箱权限
          gender:
            providerData.gender === "男"
              ? "male"
              : providerData.gender === "女"
                ? "female"
                : "unknown",
          location: [providerData.province, providerData.city].filter(Boolean).join(" "),
          bio: null,
        };

      case "weibo":
        return {
          username: `wb_${providerData.screen_name || timestamp}`,
          nickname: providerData.name || providerData.screen_name || "微博用户",
          avatar: providerData.avatar || null,
          email: null, // 微博需要单独申请邮箱权限
          gender:
            providerData.gender === "m"
              ? "male"
              : providerData.gender === "f"
                ? "female"
                : "unknown",
          location: providerData.location || null,
          bio: providerData.description || null,
        };

      default:
        return {
          username: `user_${timestamp}`,
          nickname: "用户",
          avatar: null,
          email: null,
          gender: "unknown",
          location: null,
          bio: null,
        };
    }
  }

  /**
   * 绑定第三方账户到现有用户
   */
  async bindOAuthAccount(userId, provider, oauthData) {
    try {
      // 检查用户是否存在
      const user = await User.findByPk(userId);
      if (!user) {
        throw new Error("用户不存在");
      }

      // 检查OAuth账户是否已经绑定其他用户
      const existingOAuth = await OAuthAccount.findOne({
        where: {
          provider: provider,
          provider_id: oauthData.provider_id,
        },
      });

      if (existingOAuth) {
        throw new Error("该第三方账户已绑定其他用户");
      }

      // 创建OAuth账户
      const oauthAccount = await OAuthAccount.create({
        user_id: userId,
        provider: provider,
        provider_id: oauthData.provider_id,
        provider_data: oauthData.provider_data,
        access_token: oauthData.access_token,
        refresh_token: oauthData.refresh_token,
        last_login_at: new Date(),
      });

      return oauthAccount;
    } catch (error) {
      logger.error("绑定第三方账户失败:", error);
      throw error;
    }
  }

  /**
   * 解绑第三方账户
   */
  async unbindOAuthAccount(userId, provider) {
    try {
      const result = await OAuthAccount.destroy({
        where: {
          user_id: userId,
          provider: provider,
        },
      });

      if (result === 0) {
        throw new Error("未找到要解绑的第三方账户");
      }

      return true;
    } catch (error) {
      logger.error("解绑第三方账户失败:", error);
      throw error;
    }
  }

  /**
   * 获取用户的第三方账户列表
   */
  async getUserOAuthAccounts(userId) {
    try {
      const accounts = await OAuthAccount.findAll({
        where: {
          user_id: userId,
        },
        attributes: ["id", "provider", "provider_data", "created_at", "last_login_at"],
      });

      return accounts.map((account) => ({
        id: account.id,
        provider: account.provider,
        nickname: account.provider_data?.nickname || account.provider_data?.name,
        avatar: account.provider_data?.avatar,
        created_at: account.created_at,
        last_login_at: account.last_login_at,
      }));
    } catch (error) {
      logger.error("获取第三方账户列表失败:", error);
      throw error;
    }
  }

  /**
   * 生成随机状态码
   */
  generateState() {
    return crypto.randomBytes(16).toString("hex");
  }

  /**
   * 验证状态码
   */
  validateState(state, expectedState) {
    return state === expectedState;
  }
}

module.exports = new ThirdPartyAuthService();
