module.exports = (sequelize, DataTypes) => {
  const OAuthAccount = sequelize.define('OAuthAccount', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    user_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id'
      }
    },
    provider: {
      type: DataTypes.ENUM('wechat', 'qq', 'github', 'huawei', 'gitee'),
      allowNull: false
    },
    provider_id: {
      type: DataTypes.STRING(100),
      allowNull: false,
      comment: '第三方平台的用户ID'
    },
    provider_email: {
      type: DataTypes.STRING(100),
      allowNull: true,
      comment: '第三方平台的邮箱'
    },
    provider_name: {
      type: DataTypes.STRING(100),
      allowNull: true,
      comment: '第三方平台的用户名'
    },
    provider_avatar: {
      type: DataTypes.STRING(255),
      allowNull: true,
      comment: '第三方平台的头像'
    },
    access_token: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    refresh_token: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    expires_at: {
      type: DataTypes.DATE,
      allowNull: true
    },
    created_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW
    },
    updated_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW
    }
  }, {
    tableName: 'oauth_accounts',
    timestamps: true,
    underscored: true,
    indexes: [
      { 
        unique: true, 
        fields: ['provider', 'provider_id'],
        name: 'unique_provider_user'
      },
      { fields: ['user_id', 'provider'] }
    ],
    scopes: {
      // 按提供商筛选
      byProvider: (provider) => ({
        where: { provider }
      }),
      // 有效的账户（token未过期）
      valid: {
        where: {
          [sequelize.Sequelize.Op.or]: [
            { expires_at: null },
            { expires_at: { [sequelize.Sequelize.Op.gt]: new Date() } }
          ]
        }
      }
    }
  });

  // 类方法
  OAuthAccount.findByProvider = function(provider, providerId) {
    return OAuthAccount.findOne({
      where: {
        provider,
        provider_id: providerId
      },
      include: [{
        model: sequelize.models.User,
        as: 'user',
        attributes: { exclude: ['password'] }
      }]
    });
  };

  // 创建或更新OAuth账户
  OAuthAccount.createOrUpdate = async function(oauthData) {
    const { provider, provider_id, user_id, ...otherData } = oauthData;
    
    const [account, created] = await OAuthAccount.findOrCreate({
      where: { provider, provider_id },
      defaults: {
        user_id,
        provider,
        provider_id,
        ...otherData
      }
    });

    if (!created) {
      // 更新现有账户信息
      await account.update(otherData);
    }

    return account;
  };

  // 实例方法
  OAuthAccount.prototype.isTokenExpired = function() {
    if (!this.expires_at) return false;
    return new Date() >= this.expires_at;
  };

  OAuthAccount.prototype.needsRefresh = function() {
    if (!this.expires_at) return false;
    // 提前30分钟刷新token
    const refreshTime = new Date(this.expires_at.getTime() - 30 * 60 * 1000);
    return new Date() >= refreshTime;
  };

  // 更新token
  OAuthAccount.prototype.updateToken = function(tokenData) {
    return this.update({
      access_token: tokenData.access_token,
      refresh_token: tokenData.refresh_token || this.refresh_token,
      expires_at: tokenData.expires_at || this.expires_at
    });
  };

  // 获取平台显示名称
  OAuthAccount.prototype.getProviderDisplayName = function() {
    const names = {
      wechat: '微信',
      qq: 'QQ',
      github: 'GitHub',
      huawei: '华为',
      gitee: 'Gitee'
    };
    return names[this.provider] || this.provider;
  };

  // 检查是否可以解绑
  OAuthAccount.prototype.canUnbind = async function() {
    const user = await sequelize.models.User.findByPk(this.user_id);
    
    if (!user) {
      return { canUnbind: false, reason: '用户不存在' };
    }

    // 如果用户没有设置密码，需要至少保留一个OAuth账户
    if (!user.password) {
      const oauthCount = await OAuthAccount.count({
        where: { user_id: this.user_id }
      });
      
      if (oauthCount <= 1) {
        return { 
          canUnbind: false, 
          reason: '至少需要保留一种登录方式，请先设置密码或绑定其他账户' 
        };
      }
    }

    return { canUnbind: true };
  };

  return OAuthAccount;
}; 