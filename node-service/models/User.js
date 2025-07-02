module.exports = (sequelize, DataTypes) => {
  const User = sequelize.define(
    "User",
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      username: {
        type: DataTypes.STRING(50),
        allowNull: false,
        unique: true,
        validate: {
          len: [3, 50],
        },
      },
      email: {
        type: DataTypes.STRING(100),
        allowNull: false,
        unique: true,
        validate: {
          isEmail: true,
        },
      },
      password: {
        type: DataTypes.STRING(255),
        allowNull: true, // 第三方登录用户可能没有密码
      },
      phone: {
        type: DataTypes.STRING(20),
        allowNull: true,
        unique: true,
      },
      nickname: {
        type: DataTypes.STRING(50),
        allowNull: false,
      },
      real_name: {
        type: DataTypes.STRING(50),
        allowNull: true,
      },
      avatar: {
        type: DataTypes.STRING(255),
        defaultValue: "/default/avatar.png",
      },
      gender: {
        type: DataTypes.ENUM("male", "female", "unknown"),
        defaultValue: "unknown",
      },
      birthday: {
        type: DataTypes.DATEONLY,
        allowNull: true,
      },
      bio: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      homepage: {
        type: DataTypes.STRING(255),
        allowNull: true,
      },
      location: {
        type: DataTypes.STRING(100),
        allowNull: true,
      },
      company: {
        type: DataTypes.STRING(100),
        allowNull: true,
      },
      position: {
        type: DataTypes.STRING(100),
        allowNull: true,
      },
      work_years: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
      },
      education: {
        type: DataTypes.ENUM("high_school", "college", "bachelor", "master", "doctor"),
        defaultValue: "college",
      },
      skills: {
        type: DataTypes.JSON,
        allowNull: true,
        comment: "技能标签数组",
      },
      certifications: {
        type: DataTypes.JSON,
        allowNull: true,
        comment: "认证标签数组",
      },
      social_links: {
        type: DataTypes.JSON,
        allowNull: true,
        comment: "社交链接对象",
      },
      role: {
        type: DataTypes.ENUM("user", "admin", "auditor"),
        defaultValue: "user",
      },
      status: {
        type: DataTypes.ENUM("active", "inactive", "banned"),
        defaultValue: "active",
      },
      last_login_at: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      last_login_ip: {
        type: DataTypes.STRING(45),
        allowNull: true,
      },
      email_verified: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
      },
      phone_verified: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
      },
      follower_count: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
      },
      following_count: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
      },
      content_count: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
      },
      like_count: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
      },
      view_count: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
      },
      level: {
        type: DataTypes.INTEGER,
        defaultValue: 1,
      },
      experience: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
      },
      created_at: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
      },
      updated_at: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
      },
    },
    {
      tableName: "users",
      timestamps: true,
      underscored: true,
      indexes: [
        // 联合索引，更有效率
        { fields: ["status", "role"] },
        { fields: ["level", "experience"] },
        { fields: ["created_at"] },
      ],
      scopes: {
        // 排除密码字段的查询
        withoutPassword: {
          attributes: { exclude: ["password"] },
        },
        // 活跃用户
        active: {
          where: { status: "active" },
        },
        // 按等级排序
        byLevel: {
          order: [
            ["level", "DESC"],
            ["experience", "DESC"],
          ],
        },
      },
    }
  );

  // 实例方法
  User.prototype.toSafeJSON = function () {
    const values = { ...this.get() };
    delete values.password;
    return values;
  };

  // 检查用户是否有权限
  User.prototype.hasPermission = function (permission) {
    const permissions = {
      admin: ["read", "write", "delete", "audit", "manage"],
      auditor: ["read", "write", "audit"],
      user: ["read", "write"],
    };

    return permissions[this.role]?.includes(permission) || false;
  };

  // 增加经验值
  User.prototype.addExperience = function (points) {
    const newExp = this.experience + points;
    const newLevel = Math.floor(newExp / 1000) + 1; // 每1000经验升一级

    return this.update({
      experience: newExp,
      level: newLevel,
    });
  };

  // 密码验证方法
  User.prototype.validatePassword = async function (password) {
    const bcrypt = require("bcryptjs");
    return bcrypt.compare(password, this.password);
  };

  // 密码加密钩子
  User.beforeCreate(async (user) => {
    if (user.password) {
      const bcrypt = require("bcryptjs");
      const saltRounds = 10;
      user.password = await bcrypt.hash(user.password, saltRounds);
    }
  });

  User.beforeUpdate(async (user) => {
    if (user.changed("password") && user.password) {
      const bcrypt = require("bcryptjs");
      const saltRounds = 10;
      user.password = await bcrypt.hash(user.password, saltRounds);
    }
  });

  return User;
};
