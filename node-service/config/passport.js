const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const JwtStrategy = require('passport-jwt').Strategy;
const ExtractJwt = require('passport-jwt').ExtractJwt;
const GitHubStrategy = require('passport-github2').Strategy;
const OAuth2Strategy = require('passport-oauth2').Strategy;
const bcrypt = require('bcryptjs');
const { User, OAuthAccount } = require('../models');

// JWT策略
passport.use(new JwtStrategy({
  jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
  secretOrKey: process.env.JWT_SECRET
}, async (payload, done) => {
  try {
    const user = await User.findByPk(payload.userId, {
      attributes: { exclude: ['password'] }
    });
    
    if (user && user.status === 'active') {
      return done(null, user);
    }
    return done(null, false);
  } catch (error) {
    return done(error, false);
  }
}));

// 本地策略（邮箱密码登录）
passport.use(new LocalStrategy({
  usernameField: 'email',
  passwordField: 'password'
}, async (email, password, done) => {
  try {
    const user = await User.findOne({ 
      where: { email: email.toLowerCase() } 
    });
    
    if (!user) {
      return done(null, false, { message: '邮箱或密码错误' });
    }
    
    if (user.status !== 'active') {
      return done(null, false, { message: '账户已被禁用' });
    }
    
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return done(null, false, { message: '邮箱或密码错误' });
    }
    
    return done(null, user);
  } catch (error) {
    return done(error);
  }
}));

// GitHub策略
if (process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET) {
  passport.use(new GitHubStrategy({
    clientID: process.env.GITHUB_CLIENT_ID,
    clientSecret: process.env.GITHUB_CLIENT_SECRET,
    callbackURL: `${process.env.APP_URL}/api/auth/github/callback`
  }, async (accessToken, refreshToken, profile, done) => {
    try {
      // 查找是否已有绑定的账户
      let oauthAccount = await OAuthAccount.findOne({
        where: {
          provider: 'github',
          provider_id: profile.id
        },
        include: [{ model: User, as: 'user' }]
      });

      if (oauthAccount) {
        // 更新访问令牌
        await oauthAccount.update({
          access_token: accessToken,
          refresh_token: refreshToken,
          provider_name: profile.displayName || profile.username,
          provider_avatar: profile.photos?.[0]?.value,
          provider_email: profile.emails?.[0]?.value
        });
        
        return done(null, oauthAccount.user);
      }

      // 创建新用户和OAuth绑定
      const newUser = await User.create({
        email: profile.emails?.[0]?.value || `${profile.username}@github.local`,
        nickname: profile.displayName || profile.username || 'GitHub用户',
        avatar: profile.photos?.[0]?.value || '',
        email_verified: !!profile.emails?.[0]?.value,
        status: 'active'
      });

      await OAuthAccount.create({
        user_id: newUser.id,
        provider: 'github',
        provider_id: profile.id,
        provider_email: profile.emails?.[0]?.value,
        provider_name: profile.displayName || profile.username,
        provider_avatar: profile.photos?.[0]?.value,
        access_token: accessToken,
        refresh_token: refreshToken
      });

      return done(null, newUser);
    } catch (error) {
      return done(error);
    }
  }));
}

// 微信策略
if (process.env.WECHAT_APP_ID && process.env.WECHAT_APP_SECRET) {
  passport.use('wechat', new OAuth2Strategy({
    authorizationURL: 'https://open.weixin.qq.com/connect/qrconnect',
    tokenURL: 'https://api.weixin.qq.com/sns/oauth2/access_token',
    clientID: process.env.WECHAT_APP_ID,
    clientSecret: process.env.WECHAT_APP_SECRET,
    callbackURL: `${process.env.APP_URL}/api/auth/wechat/callback`,
    scope: 'snsapi_login'
  }, async (accessToken, refreshToken, params, profile, done) => {
    try {
      // 获取用户信息
      const response = await fetch(`https://api.weixin.qq.com/sns/userinfo?access_token=${accessToken}&openid=${params.openid}`);
      const userInfo = await response.json();

      if (userInfo.errcode) {
        return done(new Error('获取微信用户信息失败'));
      }

      let oauthAccount = await OAuthAccount.findOne({
        where: {
          provider: 'wechat',
          provider_id: userInfo.openid
        },
        include: [{ model: User, as: 'user' }]
      });

      if (oauthAccount) {
        await oauthAccount.update({
          access_token: accessToken,
          refresh_token: refreshToken,
          provider_name: userInfo.nickname,
          provider_avatar: userInfo.headimgurl
        });
        
        return done(null, oauthAccount.user);
      }

      const newUser = await User.create({
        email: `${userInfo.openid}@wechat.local`,
        nickname: userInfo.nickname || '微信用户',
        avatar: userInfo.headimgurl || '',
        gender: userInfo.sex === 1 ? 'male' : userInfo.sex === 2 ? 'female' : 'unknown',
        status: 'active'
      });

      await OAuthAccount.create({
        user_id: newUser.id,
        provider: 'wechat',
        provider_id: userInfo.openid,
        provider_name: userInfo.nickname,
        provider_avatar: userInfo.headimgurl,
        access_token: accessToken,
        refresh_token: refreshToken
      });

      return done(null, newUser);
    } catch (error) {
      return done(error);
    }
  }));
}

// QQ策略
if (process.env.QQ_APP_ID && process.env.QQ_APP_SECRET) {
  passport.use('qq', new OAuth2Strategy({
    authorizationURL: 'https://graph.qq.com/oauth2.0/authorize',
    tokenURL: 'https://graph.qq.com/oauth2.0/token',
    clientID: process.env.QQ_APP_ID,
    clientSecret: process.env.QQ_APP_SECRET,
    callbackURL: `${process.env.APP_URL}/api/auth/qq/callback`
  }, async (accessToken, refreshToken, params, profile, done) => {
    try {
      // 获取openid
      const openidResponse = await fetch(`https://graph.qq.com/oauth2.0/me?access_token=${accessToken}`);
      const openidText = await openidResponse.text();
      const openidMatch = openidText.match(/\"openid\":\"(\w+)\"/);
      
      if (!openidMatch) {
        return done(new Error('获取QQ openid失败'));
      }
      
      const openid = openidMatch[1];
      
      // 获取用户信息
      const userResponse = await fetch(`https://graph.qq.com/user/get_user_info?access_token=${accessToken}&oauth_consumer_key=${process.env.QQ_APP_ID}&openid=${openid}`);
      const userInfo = await userResponse.json();

      if (userInfo.ret !== 0) {
        return done(new Error('获取QQ用户信息失败'));
      }

      let oauthAccount = await OAuthAccount.findOne({
        where: {
          provider: 'qq',
          provider_id: openid
        },
        include: [{ model: User, as: 'user' }]
      });

      if (oauthAccount) {
        await oauthAccount.update({
          access_token: accessToken,
          refresh_token: refreshToken,
          provider_name: userInfo.nickname,
          provider_avatar: userInfo.figureurl_qq_2 || userInfo.figureurl_qq_1
        });
        
        return done(null, oauthAccount.user);
      }

      const newUser = await User.create({
        email: `${openid}@qq.local`,
        nickname: userInfo.nickname || 'QQ用户',
        avatar: userInfo.figureurl_qq_2 || userInfo.figureurl_qq_1 || '',
        gender: userInfo.gender === '男' ? 'male' : userInfo.gender === '女' ? 'female' : 'unknown',
        status: 'active'
      });

      await OAuthAccount.create({
        user_id: newUser.id,
        provider: 'qq',
        provider_id: openid,
        provider_name: userInfo.nickname,
        provider_avatar: userInfo.figureurl_qq_2 || userInfo.figureurl_qq_1,
        access_token: accessToken,
        refresh_token: refreshToken
      });

      return done(null, newUser);
    } catch (error) {
      return done(error);
    }
  }));
}

// Gitee策略
if (process.env.GITEE_CLIENT_ID && process.env.GITEE_CLIENT_SECRET) {
  passport.use('gitee', new OAuth2Strategy({
    authorizationURL: 'https://gitee.com/oauth/authorize',
    tokenURL: 'https://gitee.com/oauth/token',
    clientID: process.env.GITEE_CLIENT_ID,
    clientSecret: process.env.GITEE_CLIENT_SECRET,
    callbackURL: `${process.env.APP_URL}/api/auth/gitee/callback`
  }, async (accessToken, refreshToken, params, profile, done) => {
    try {
      // 获取用户信息
      const response = await fetch(`https://gitee.com/api/v5/user?access_token=${accessToken}`);
      const userInfo = await response.json();

      if (!userInfo.id) {
        return done(new Error('获取Gitee用户信息失败'));
      }

      let oauthAccount = await OAuthAccount.findOne({
        where: {
          provider: 'gitee',
          provider_id: userInfo.id.toString()
        },
        include: [{ model: User, as: 'user' }]
      });

      if (oauthAccount) {
        await oauthAccount.update({
          access_token: accessToken,
          refresh_token: refreshToken,
          provider_name: userInfo.name || userInfo.login,
          provider_avatar: userInfo.avatar_url,
          provider_email: userInfo.email
        });
        
        return done(null, oauthAccount.user);
      }

      const newUser = await User.create({
        email: userInfo.email || `${userInfo.login}@gitee.local`,
        nickname: userInfo.name || userInfo.login || 'Gitee用户',
        avatar: userInfo.avatar_url || '',
        bio: userInfo.bio || '',
        homepage: userInfo.blog || userInfo.html_url,
        location: userInfo.location || '',
        company: userInfo.company || '',
        email_verified: !!userInfo.email,
        status: 'active'
      });

      await OAuthAccount.create({
        user_id: newUser.id,
        provider: 'gitee',
        provider_id: userInfo.id.toString(),
        provider_email: userInfo.email,
        provider_name: userInfo.name || userInfo.login,
        provider_avatar: userInfo.avatar_url,
        access_token: accessToken,
        refresh_token: refreshToken
      });

      return done(null, newUser);
    } catch (error) {
      return done(error);
    }
  }));
}

// 华为策略
if (process.env.HUAWEI_CLIENT_ID && process.env.HUAWEI_CLIENT_SECRET) {
  passport.use('huawei', new OAuth2Strategy({
    authorizationURL: 'https://oauth-login.cloud.huawei.com/oauth2/v3/authorize',
    tokenURL: 'https://oauth-login.cloud.huawei.com/oauth2/v3/token',
    clientID: process.env.HUAWEI_CLIENT_ID,
    clientSecret: process.env.HUAWEI_CLIENT_SECRET,
    callbackURL: `${process.env.APP_URL}/api/auth/huawei/callback`
  }, async (accessToken, refreshToken, params, profile, done) => {
    try {
      // 获取用户信息
      const response = await fetch('https://api.vmall.com/rest/hwid/v1/user/info', {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      });
      const result = await response.json();

      if (result.ret !== 0) {
        return done(new Error('获取华为用户信息失败'));
      }

      const userInfo = result.userInfo;

      let oauthAccount = await OAuthAccount.findOne({
        where: {
          provider: 'huawei',
          provider_id: userInfo.openId
        },
        include: [{ model: User, as: 'user' }]
      });

      if (oauthAccount) {
        await oauthAccount.update({
          access_token: accessToken,
          refresh_token: refreshToken,
          provider_name: userInfo.displayName,
          provider_avatar: userInfo.headPictureURL,
          provider_email: userInfo.email
        });
        
        return done(null, oauthAccount.user);
      }

      const newUser = await User.create({
        email: userInfo.email || `${userInfo.openId}@huawei.local`,
        nickname: userInfo.displayName || '华为用户',
        avatar: userInfo.headPictureURL || '',
        email_verified: !!userInfo.email,
        status: 'active'
      });

      await OAuthAccount.create({
        user_id: newUser.id,
        provider: 'huawei',
        provider_id: userInfo.openId,
        provider_email: userInfo.email,
        provider_name: userInfo.displayName,
        provider_avatar: userInfo.headPictureURL,
        access_token: accessToken,
        refresh_token: refreshToken
      });

      return done(null, newUser);
    } catch (error) {
      return done(error);
    }
  }));
}

module.exports = passport; 