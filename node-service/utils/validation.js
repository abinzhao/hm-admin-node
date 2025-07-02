const { body, param, query, validationResult } = require("express-validator");

// 简单验证函数（用于控制器直接调用）
const validation = {
  isEmail: (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  },

  isStrongPassword: (password) => {
    // 至少8个字符，包含大小写字母和数字
    return password && password.length >= 8 && /(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(password);
  },

  isNickname: (nickname) => {
    return nickname && nickname.length >= 2 && nickname.length <= 20;
  },

  isPhone: (phone) => {
    const phoneRegex = /^1[3-9]\d{9}$/;
    return phoneRegex.test(phone);
  },
};

// 验证错误处理中间件
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      error: {
        message: "数据验证失败",
        code: "VALIDATION_ERROR",
        details: errors.array(),
      },
    });
  }
  next();
};

// 常用验证规则
const rules = {
  // 用户相关验证
  email: () => body("email").isEmail().withMessage("邮箱格式不正确").normalizeEmail(),

  password: () =>
    body("password")
      .isLength({ min: 6, max: 20 })
      .withMessage("密码长度必须在6-20位之间")
      .matches(/^(?=.*[A-Za-z])(?=.*\d)/)
      .withMessage("密码必须包含字母和数字"),

  nickname: () =>
    body("nickname")
      .isLength({ min: 2, max: 20 })
      .withMessage("昵称长度必须在2-20位之间")
      .matches(/^[\u4e00-\u9fa5a-zA-Z0-9_]+$/)
      .withMessage("昵称只能包含中文、英文、数字和下划线"),

  phone: () => body("phone").optional().isMobilePhone("zh-CN").withMessage("手机号格式不正确"),

  // 内容相关验证
  title: () =>
    body("title").isLength({ min: 1, max: 200 }).withMessage("标题长度必须在1-200字之间").trim(),

  content: () =>
    body("content")
      .isLength({ min: 1, max: 50000 })
      .withMessage("内容长度必须在1-50000字之间")
      .trim(),

  summary: () =>
    body("summary").optional().isLength({ max: 500 }).withMessage("摘要长度不能超过500字").trim(),

  categoryId: () =>
    body("category_id").optional().isInt({ min: 1 }).withMessage("分类ID必须是正整数"),

  tags: () =>
    body("tags")
      .optional()
      .isArray()
      .withMessage("标签必须是数组")
      .custom((tags) => {
        if (tags.length > 10) {
          throw new Error("标签数量不能超过10个");
        }
        for (const tag of tags) {
          if (typeof tag !== "string" || tag.length > 20) {
            throw new Error("每个标签长度不能超过20字");
          }
        }
        return true;
      }),

  // 待办事项验证
  todoTitle: () =>
    body("title")
      .isLength({ min: 1, max: 200 })
      .withMessage("待办标题长度必须在1-200字之间")
      .trim(),

  priority: () =>
    body("priority")
      .optional()
      .isIn(["low", "medium", "high", "urgent"])
      .withMessage("优先级必须是 low, medium, high, urgent 中的一个"),

  status: () =>
    body("status")
      .optional()
      .isIn(["todo", "in_progress", "completed", "cancelled"])
      .withMessage("状态必须是 todo, in_progress, completed, cancelled 中的一个"),

  dueDate: () =>
    body("due_date")
      .optional()
      .isISO8601()
      .withMessage("截止时间格式不正确")
      .custom((value) => {
        if (new Date(value) <= new Date()) {
          throw new Error("截止时间必须是未来时间");
        }
        return true;
      }),

  // 分页验证
  pagination: () => [
    query("page").optional().isInt({ min: 1 }).withMessage("页码必须是正整数"),
    query("limit").optional().isInt({ min: 1, max: 100 }).withMessage("每页数量必须在1-100之间"),
  ],

  // ID验证
  id: () => param("id").isInt({ min: 1 }).withMessage("ID必须是正整数"),

  uuid: () => param("id").isUUID().withMessage("ID格式不正确"),

  // 文件上传验证
  fileType: (allowedTypes = []) =>
    body("fileType")
      .optional()
      .isIn(allowedTypes)
      .withMessage(`文件类型必须是 ${allowedTypes.join(", ")} 中的一个`),

  // 搜索验证
  searchQuery: () =>
    query("q")
      .optional()
      .isLength({ min: 1, max: 100 })
      .withMessage("搜索关键词长度必须在1-100字之间")
      .trim(),

  // 评论验证
  commentContent: () =>
    body("content")
      .isLength({ min: 1, max: 1000 })
      .withMessage("评论内容长度必须在1-1000字之间")
      .trim(),

  // 举报验证
  reportReason: () =>
    body("reason")
      .isIn(["spam", "inappropriate", "copyright", "fake", "other"])
      .withMessage("举报原因必须是有效选项"),

  reportDescription: () =>
    body("description")
      .optional()
      .isLength({ max: 500 })
      .withMessage("举报描述不能超过500字")
      .trim(),

  // 团队验证
  teamName: () =>
    body("name").isLength({ min: 2, max: 50 }).withMessage("团队名称长度必须在2-50字之间").trim(),

  teamRole: () =>
    body("role")
      .optional()
      .isIn(["owner", "admin", "member"])
      .withMessage("团队角色必须是 owner, admin, member 中的一个"),

  // 消息验证
  messageContent: () =>
    body("content")
      .isLength({ min: 1, max: 2000 })
      .withMessage("消息内容长度必须在1-2000字之间")
      .trim(),

  messageType: () =>
    body("type")
      .optional()
      .isIn(["text", "image", "file"])
      .withMessage("消息类型必须是 text, image, file 中的一个"),

  // 软件包验证
  packageName: () =>
    body("name")
      .isLength({ min: 2, max: 100 })
      .withMessage("软件包名称长度必须在2-100字之间")
      .trim(),

  packageVersion: () =>
    body("version")
      .optional()
      .matches(/^\d+\.\d+\.\d+$/)
      .withMessage("版本号格式不正确，应为 x.y.z 格式"),

  // 敏感词验证
  sensitiveWord: () =>
    body("word").isLength({ min: 1, max: 100 }).withMessage("敏感词长度必须在1-100字之间").trim(),

  sensitiveWordType: () =>
    body("type")
      .optional()
      .isIn(["forbidden", "replace", "review"])
      .withMessage("敏感词类型必须是 forbidden, replace, review 中的一个"),

  // 系统配置验证
  configKey: () =>
    body("config_key")
      .isLength({ min: 1, max: 100 })
      .withMessage("配置键长度必须在1-100字之间")
      .matches(/^[a-zA-Z0-9_]+$/)
      .withMessage("配置键只能包含字母、数字和下划线"),

  configValue: () =>
    body("config_value").isLength({ max: 5000 }).withMessage("配置值长度不能超过5000字"),

  configType: () =>
    body("type")
      .optional()
      .isIn(["string", "number", "boolean", "json"])
      .withMessage("配置类型必须是 string, number, boolean, json 中的一个"),
};

// 组合验证规则
const validators = {
  // 用户注册
  register: [
    rules.email(),
    rules.password(),
    rules.nickname(),
    rules.phone(),
    handleValidationErrors,
  ],

  // 用户登录
  login: [
    rules.email(),
    body("password").notEmpty().withMessage("密码不能为空"),
    handleValidationErrors,
  ],

  // 更新用户信息
  updateProfile: [
    rules.nickname(),
    rules.phone(),
    body("bio").optional().isLength({ max: 500 }).withMessage("个人简介不能超过500字"),
    body("gender").optional().isIn(["male", "female", "unknown"]).withMessage("性别值不正确"),
    handleValidationErrors,
  ],

  // 创建内容
  createContent: [
    rules.title(),
    rules.content(),
    rules.summary(),
    rules.categoryId(),
    rules.tags(),
    body("type").isIn(["article", "question", "snippet"]).withMessage("内容类型不正确"),
    handleValidationErrors,
  ],

  // 更新内容
  updateContent: [
    rules.id(),
    rules.title(),
    rules.content(),
    rules.summary(),
    rules.categoryId(),
    rules.tags(),
    handleValidationErrors,
  ],

  // 创建待办事项
  createTodo: [
    rules.todoTitle(),
    body("description").optional().isLength({ max: 2000 }).withMessage("描述不能超过2000字"),
    rules.priority(),
    rules.dueDate(),
    body("category").optional().isLength({ max: 50 }).withMessage("分类名称不能超过50字"),
    handleValidationErrors,
  ],

  // 更新待办事项
  updateTodo: [
    rules.id(),
    rules.todoTitle(),
    body("description").optional().isLength({ max: 2000 }).withMessage("描述不能超过2000字"),
    rules.priority(),
    rules.status(),
    rules.dueDate(),
    body("progress").optional().isInt({ min: 0, max: 100 }).withMessage("进度必须在0-100之间"),
    handleValidationErrors,
  ],

  // 分页查询
  pagination: [...rules.pagination(), handleValidationErrors],

  // 搜索
  search: [rules.searchQuery(), ...rules.pagination(), handleValidationErrors],

  // 创建评论
  createComment: [
    rules.commentContent(),
    param("id").isInt({ min: 1 }).withMessage("目标ID必须是正整数"),
    handleValidationErrors,
  ],

  // 举报
  createReport: [
    rules.reportReason(),
    rules.reportDescription(),
    param("id").isInt({ min: 1 }).withMessage("目标ID必须是正整数"),
    handleValidationErrors,
  ],

  // 创建团队
  createTeam: [
    rules.teamName(),
    body("description").optional().isLength({ max: 500 }).withMessage("团队描述不能超过500字"),
    handleValidationErrors,
  ],

  // 发送消息
  sendMessage: [
    rules.messageContent(),
    rules.messageType(),
    param("userId").isInt({ min: 1 }).withMessage("用户ID必须是正整数"),
    handleValidationErrors,
  ],

  // 上传软件包
  uploadPackage: [
    rules.packageName(),
    body("description")
      .isLength({ min: 10, max: 2000 })
      .withMessage("软件包描述长度必须在10-2000字之间"),
    rules.packageVersion(),
    rules.categoryId(),
    handleValidationErrors,
  ],

  // 添加敏感词
  addSensitiveWord: [
    rules.sensitiveWord(),
    rules.sensitiveWordType(),
    body("category").optional().isLength({ max: 50 }).withMessage("分类名称不能超过50字"),
    handleValidationErrors,
  ],

  // 更新系统配置
  updateConfig: [
    rules.configKey(),
    rules.configValue(),
    rules.configType(),
    body("description").optional().isLength({ max: 255 }).withMessage("配置描述不能超过255字"),
    handleValidationErrors,
  ],
};

module.exports = {
  validation,
  rules,
  validators,
  handleValidationErrors,
};
