/**
 * 全面的功能测试脚本 - HM程序员社区
 * 测试所有API接口和功能模块
 */

const axios = require("axios");

const BASE_URL = "http://localhost:3000/api";
const TEST_USER = {
  username: "testuser2024",
  email: "testuser2024@example.com",
  password: "TestPass123!",
  nickname: "测试用户2024",
  phone: "13800138000",
};

let authToken = "";
let testUserId = "";
let testContentId = "";
let testChatId = "";
let testTodoId = "";
let testCommentId = "";

// HTTP客户端配置
const api = axios.create({
  baseURL: BASE_URL,
  timeout: 15000,
});

// 请求拦截器 - 添加认证头
api.interceptors.request.use((config) => {
  if (authToken) {
    config.headers.Authorization = `Bearer ${authToken}`;
  }
  return config;
});

// 响应拦截器 - 处理错误
api.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error("❌ API请求失败:", error.response?.data || error.message);
    return Promise.reject(error);
  }
);

/**
 * 工具函数
 */
function log(message, data = null) {
  console.log(`🔍 ${message}`);
  if (data) {
    console.log(JSON.stringify(data, null, 2));
  }
}

function success(message, data = null) {
  console.log(`✅ ${message}`);
  if (data) {
    console.log(JSON.stringify(data, null, 2));
  }
}

function error(message, err = null) {
  console.log(`❌ ${message}`);
  if (err) {
    console.log(err.response?.data || err.message || err);
  }
}

async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * 1. 测试用户认证模块
 */
async function testAuthentication() {
  console.log("\n🔐 === 测试用户认证模块 ===");

  try {
    // 1.1 检查服务器状态
    log("检查服务器状态...");
    const statusResponse = await api.get("/status");
    success("服务器状态正常", {
      database: statusResponse.data.database.status,
      uptime: statusResponse.data.uptime,
    });

    // 1.2 用户注册
    log("注册测试用户...");
    try {
      const registerResponse = await api.post("/auth/register", TEST_USER);
      success("用户注册成功", {
        user: registerResponse.data.data.user.nickname,
        hasToken: !!registerResponse.data.data.accessToken,
      });
      authToken = registerResponse.data.data.accessToken;
      testUserId = registerResponse.data.data.user.id;
    } catch (err) {
      if (err.response?.status === 400 && err.response?.data?.message?.includes("已被注册")) {
        log("用户已存在，尝试登录...");
        const loginResponse = await api.post("/auth/login", {
          email: TEST_USER.email,
          password: TEST_USER.password,
        });
        success("用户登录成功");
        authToken = loginResponse.data.data.accessToken;
        testUserId = loginResponse.data.data.user.id;
      } else {
        throw err;
      }
    }

    // 1.3 获取用户信息
    log("获取用户信息...");
    const profileResponse = await api.get("/auth/profile");
    success("获取用户信息成功", {
      id: profileResponse.data.data.id,
      nickname: profileResponse.data.data.nickname,
      email: profileResponse.data.data.email,
    });

    // 1.4 修改密码
    log("测试修改密码...");
    try {
      await api.post("/auth/change-password", {
        currentPassword: TEST_USER.password,
        newPassword: TEST_USER.password, // 使用相同密码以便后续测试
      });
      success("密码修改成功");
    } catch (err) {
      log("密码修改测试（可能因为密码相同而失败，这是正常的）");
    }

    return true;
  } catch (err) {
    error("用户认证测试失败", err);
    return false;
  }
}

/**
 * 2. 测试用户管理模块
 */
async function testUserManagement() {
  console.log("\n👤 === 测试用户管理模块 ===");

  try {
    // 2.1 获取用户列表
    log("获取用户列表...");
    const usersResponse = await api.get("/users?page=1&limit=10");
    success("获取用户列表成功", {
      count: usersResponse.data.data.users.length,
      pagination: usersResponse.data.data.pagination,
    });

    // 2.2 获取用户详情
    log("获取用户详情...");
    const userDetailResponse = await api.get(`/users/${testUserId}`);
    success("获取用户详情成功", {
      id: userDetailResponse.data.data.id,
      nickname: userDetailResponse.data.data.nickname,
    });

    // 2.3 更新用户信息
    log("更新用户信息...");
    const updateResponse = await api.put(`/users/${testUserId}`, {
      bio: "这是更新后的个人简介",
      location: "测试城市",
    });
    success("更新用户信息成功", {
      bio: updateResponse.data.data.bio,
      location: updateResponse.data.data.location,
    });

    return true;
  } catch (err) {
    error("用户管理测试失败", err);
    return false;
  }
}

/**
 * 3. 测试内容管理模块
 */
async function testContentManagement() {
  console.log("\n📝 === 测试内容管理模块 ===");

  try {
    // 3.1 获取分类列表
    log("获取分类列表...");
    const categoriesResponse = await api.get("/content/categories");
    success("获取分类列表成功", {
      count: categoriesResponse.data.data.length,
    });

    // 3.2 获取标签列表
    log("获取标签列表...");
    const tagsResponse = await api.get("/content/tags");
    success("获取标签列表成功", {
      count: tagsResponse.data.data.length,
    });

    // 3.3 创建内容
    log("创建测试文章...");
    const createContentResponse = await api.post("/content", {
      type: "article",
      title: "测试文章标题",
      summary: "这是一个测试文章的摘要",
      content: "这是测试文章的详细内容。包含了一些测试文本。",
      category_id: categoriesResponse.data.data[0]?.id,
      tags: ["JavaScript", "测试"],
    });
    success("创建文章成功", {
      id: createContentResponse.data.data.id,
      title: createContentResponse.data.data.title,
    });
    testContentId = createContentResponse.data.data.id;

    // 3.4 获取内容列表
    log("获取内容列表...");
    const contentsResponse = await api.get("/content?page=1&limit=10");
    success("获取内容列表成功", {
      count: contentsResponse.data.data.contents.length,
      pagination: contentsResponse.data.data.pagination,
    });

    // 3.5 获取内容详情
    log("获取内容详情...");
    const contentDetailResponse = await api.get(`/content/${testContentId}`);
    success("获取内容详情成功", {
      id: contentDetailResponse.data.data.id,
      title: contentDetailResponse.data.data.title,
      author: contentDetailResponse.data.data.author?.nickname,
    });

    // 3.6 更新内容
    log("更新内容...");
    const updateContentResponse = await api.put(`/content/${testContentId}`, {
      title: "更新后的测试文章标题",
      summary: "更新后的摘要",
    });
    success("更新内容成功", {
      title: updateContentResponse.data.data.title,
    });

    return true;
  } catch (err) {
    error("内容管理测试失败", err);
    return false;
  }
}

/**
 * 4. 测试评论系统
 */
async function testCommentSystem() {
  console.log("\n💬 === 测试评论系统 ===");

  try {
    // 4.1 创建评论
    log("创建评论...");
    const createCommentResponse = await api.post("/comments", {
      target_type: "content",
      target_id: testContentId,
      content: "这是一个测试评论",
    });
    success("创建评论成功", {
      id: createCommentResponse.data.data.id,
      content: createCommentResponse.data.data.content,
    });
    testCommentId = createCommentResponse.data.data.id;

    // 4.2 获取评论列表
    log("获取评论列表...");
    const commentsResponse = await api.get(
      `/comments?target_type=content&target_id=${testContentId}`
    );
    success("获取评论列表成功", {
      count: commentsResponse.data.data.comments.length,
    });

    // 4.3 回复评论
    log("回复评论...");
    const replyResponse = await api.post("/comments", {
      target_type: "content",
      target_id: testContentId,
      parent_id: testCommentId,
      content: "这是对评论的回复",
    });
    success("回复评论成功", {
      content: replyResponse.data.data.content,
      parent_id: replyResponse.data.data.parent_id,
    });

    return true;
  } catch (err) {
    error("评论系统测试失败", err);
    return false;
  }
}

/**
 * 5. 测试互动功能（点赞、收藏）
 */
async function testInteractionFeatures() {
  console.log("\n❤️ === 测试互动功能 ===");

  try {
    // 5.1 点赞内容
    log("点赞内容...");
    const likeResponse = await api.post(`/content/${testContentId}/like`);
    success("点赞成功", {
      liked: likeResponse.data.data.liked,
    });

    // 5.2 收藏内容
    log("收藏内容...");
    const favoriteResponse = await api.post(`/content/${testContentId}/favorite`);
    success("收藏成功", {
      favorited: favoriteResponse.data.data.favorited,
    });

    // 5.3 获取用户点赞列表
    log("获取用户点赞列表...");
    const likesResponse = await api.get("/users/likes");
    success("获取点赞列表成功", {
      count: likesResponse.data.data.likes.length,
    });

    // 5.4 获取用户收藏列表
    log("获取用户收藏列表...");
    const favoritesResponse = await api.get("/users/favorites");
    success("获取收藏列表成功", {
      count: favoritesResponse.data.data.favorites.length,
    });

    return true;
  } catch (err) {
    error("互动功能测试失败", err);
    return false;
  }
}

/**
 * 6. 测试待办事项系统
 */
async function testTodoSystem() {
  console.log("\n📋 === 测试待办事项系统 ===");

  try {
    // 6.1 创建待办事项
    log("创建待办事项...");
    const createTodoResponse = await api.post("/todos", {
      title: "测试待办事项",
      description: "这是一个测试的待办事项",
      priority: "medium",
      due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    });
    success("创建待办事项成功", {
      id: createTodoResponse.data.data.id,
      title: createTodoResponse.data.data.title,
    });
    testTodoId = createTodoResponse.data.data.id;

    // 6.2 获取待办事项列表
    log("获取待办事项列表...");
    const todosResponse = await api.get("/todos");
    success("获取待办事项列表成功", {
      count: todosResponse.data.data.todos.length,
    });

    // 6.3 更新待办事项
    log("更新待办事项...");
    const updateTodoResponse = await api.put(`/todos/${testTodoId}`, {
      status: "in_progress",
      progress: 50,
    });
    success("更新待办事项成功", {
      status: updateTodoResponse.data.data.status,
      progress: updateTodoResponse.data.data.progress,
    });

    // 6.4 完成待办事项
    log("完成待办事项...");
    const completeTodoResponse = await api.put(`/todos/${testTodoId}`, {
      status: "completed",
      progress: 100,
    });
    success("完成待办事项成功", {
      status: completeTodoResponse.data.data.status,
    });

    return true;
  } catch (err) {
    error("待办事项系统测试失败", err);
    return false;
  }
}

/**
 * 7. 测试聊天系统
 */
async function testChatSystem() {
  console.log("\n💬 === 测试聊天系统 ===");

  try {
    // 7.1 获取聊天列表
    log("获取聊天列表...");
    const chatsResponse = await api.get("/chats");
    success("获取聊天列表成功", {
      count: chatsResponse.data.data.chats.length,
    });

    // 7.2 创建群聊
    log("创建测试群聊...");
    const createChatResponse = await api.post("/chats/group", {
      name: "测试群聊2024",
      description: "这是一个测试群聊",
      is_public: true,
      max_members: 100,
    });
    success("创建群聊成功", {
      chatId: createChatResponse.data.data.chat.id,
      name: createChatResponse.data.data.chat.name,
    });
    testChatId = createChatResponse.data.data.chat.id;

    // 7.3 发送消息
    log("发送测试消息...");
    const messageResponse = await api.post(`/chats/${testChatId}/messages`, {
      type: "text",
      content: "这是一条测试消息！Hello World! 🎉",
    });
    success("发送消息成功", {
      messageId: messageResponse.data.data.message.id,
      content: messageResponse.data.data.message.content,
    });

    // 7.4 获取消息列表
    log("获取消息列表...");
    const messagesResponse = await api.get(`/chats/${testChatId}/messages`);
    success("获取消息列表成功", {
      count: messagesResponse.data.data.messages.length,
    });

    // 7.5 获取聊天成员
    log("获取聊天成员...");
    const membersResponse = await api.get(`/chats/${testChatId}/members`);
    success("获取聊天成员成功", {
      count: membersResponse.data.data.members.length,
    });

    return true;
  } catch (err) {
    error("聊天系统测试失败", err);
    return false;
  }
}

/**
 * 8. 测试搜索功能
 */
async function testSearchFeatures() {
  console.log("\n🔍 === 测试搜索功能 ===");

  try {
    // 8.1 全局搜索
    log("测试全局搜索...");
    const globalSearchResponse = await api.get("/search?keyword=测试&page=1&limit=10");
    success("全局搜索成功", {
      totalResults: globalSearchResponse.data.data.summary?.total || 0,
    });

    // 8.2 热门搜索
    log("获取热门搜索...");
    const hotSearchResponse = await api.get("/search/trending?limit=10");
    success("获取热门搜索成功", {
      count: hotSearchResponse.data.data.length,
    });

    // 8.3 搜索建议
    log("获取搜索建议...");
    const suggestResponse = await api.get("/search/suggestions?keyword=测&limit=5");
    success("获取搜索建议成功", {
      count: suggestResponse.data.data.length,
    });

    return true;
  } catch (err) {
    error("搜索功能测试失败", err);
    return false;
  }
}

/**
 * 9. 测试移动端API
 */
async function testMobileAPI() {
  console.log("\n📱 === 测试移动端API ===");

  try {
    // 9.1 获取首页数据
    log("获取移动端首页数据...");
    const homeResponse = await api.get("/mobile/home?include_chats=true&include_todos=true");
    success("获取首页数据成功", {
      hasUser: !!homeResponse.data.data.user,
      stats: homeResponse.data.data.stats,
    });

    // 9.2 网络状态检测
    log("网络状态检测...");
    const networkResponse = await api.get("/mobile/network");
    success("网络状态检测成功", {
      latency: networkResponse.data.data.latency,
      quality: networkResponse.data.data.quality,
    });

    // 9.3 设备信息上报
    log("上报设备信息...");
    const deviceResponse = await api.post("/mobile/device", {
      device_type: "ios",
      os_version: "17.0",
      app_version: "1.0.0",
      device_id: "test-device-12345",
    });
    success("设备信息上报成功");

    return true;
  } catch (err) {
    error("移动端API测试失败", err);
    return false;
  }
}

/**
 * 10. 测试通知系统
 */
async function testNotificationSystem() {
  console.log("\n🔔 === 测试通知系统 ===");

  try {
    // 10.1 获取通知列表
    log("获取通知列表...");
    const notificationsResponse = await api.get("/notifications");
    success("获取通知列表成功", {
      count: notificationsResponse.data.data.notifications.length,
    });

    // 10.2 获取未读通知数量
    log("获取未读通知数量...");
    const unreadResponse = await api.get("/notifications/unread-count");
    success("获取未读通知数量成功", {
      count: unreadResponse.data.data.count,
    });

    return true;
  } catch (err) {
    error("通知系统测试失败", err);
    return false;
  }
}

/**
 * 11. 测试文件上传
 */
async function testFileUpload() {
  console.log("\n📁 === 测试文件上传 ===");

  try {
    // 11.1 获取上传配置
    log("获取上传配置...");
    const configResponse = await api.get("/upload/config");
    success("获取上传配置成功", {
      maxSize: configResponse.data.data.maxSize,
      allowedTypes: configResponse.data.data.allowedTypes.slice(0, 3),
    });

    // 11.2 获取用户上传的文件列表
    log("获取用户文件列表...");
    const filesResponse = await api.get("/upload/files");
    success("获取文件列表成功", {
      count: filesResponse.data.data.files.length,
    });

    return true;
  } catch (err) {
    error("文件上传测试失败", err);
    return false;
  }
}

/**
 * 12. 测试第三方集成
 */
async function testThirdPartyIntegration() {
  console.log("\n🔗 === 测试第三方集成 ===");

  try {
    // 12.1 发送短信验证码
    log("发送短信验证码...");
    const smsResponse = await api.post("/auth/sms/send", {
      phone: "13912345678",
      type: "test",
    });
    success("短信验证码发送成功", {
      expireMinutes: smsResponse.data.data.expireMinutes,
    });

    // 12.2 获取第三方登录URL
    log("获取第三方登录URL...");
    try {
      const wechatUrlResponse = await api.get("/auth/oauth/wechat/url?state=test123");
      success("获取微信登录URL成功");
    } catch (err) {
      log("微信登录配置未完成（这是正常的）");
    }

    return true;
  } catch (err) {
    error("第三方集成测试失败", err);
    return false;
  }
}

/**
 * 清理测试数据
 */
async function cleanup() {
  console.log("\n🧹 === 清理测试数据 ===");

  try {
    // 清理创建的内容
    if (testContentId) {
      log("删除测试内容...");
      try {
        await api.delete(`/content/${testContentId}`);
        success("测试内容删除成功");
      } catch (err) {
        log("测试内容可能已不存在，跳过删除");
      }
    }

    // 清理待办事项
    if (testTodoId) {
      log("删除测试待办事项...");
      try {
        await api.delete(`/todos/${testTodoId}`);
        success("测试待办事项删除成功");
      } catch (err) {
        log("测试待办事项可能已不存在，跳过删除");
      }
    }

    log("测试数据清理完成");
    return true;
  } catch (err) {
    error("清理测试数据失败", err);
    return false;
  }
}

/**
 * 主测试函数
 */
async function runAllTests() {
  console.log("🚀 === HM程序员社区全功能测试开始 ===");
  console.log(`🌐 测试服务器: ${BASE_URL}`);
  console.log(`⏰ 测试时间: ${new Date().toLocaleString()}`);

  const results = {
    authentication: false,
    userManagement: false,
    contentManagement: false,
    commentSystem: false,
    interactionFeatures: false,
    todoSystem: false,
    chatSystem: false,
    searchFeatures: false,
    mobileAPI: false,
    notificationSystem: false,
    fileUpload: false,
    thirdPartyIntegration: false,
    cleanup: false,
  };

  try {
    // 1. 测试用户认证
    results.authentication = await testAuthentication();
    await sleep(1000);

    // 2. 测试用户管理
    results.userManagement = await testUserManagement();
    await sleep(1000);

    // 3. 测试内容管理
    results.contentManagement = await testContentManagement();
    await sleep(1000);

    // 4. 测试评论系统
    results.commentSystem = await testCommentSystem();
    await sleep(1000);

    // 5. 测试互动功能
    results.interactionFeatures = await testInteractionFeatures();
    await sleep(1000);

    // 6. 测试待办事项
    results.todoSystem = await testTodoSystem();
    await sleep(1000);

    // 7. 测试聊天系统
    results.chatSystem = await testChatSystem();
    await sleep(1000);

    // 8. 测试搜索功能
    results.searchFeatures = await testSearchFeatures();
    await sleep(1000);

    // 9. 测试移动端API
    results.mobileAPI = await testMobileAPI();
    await sleep(1000);

    // 10. 测试通知系统
    results.notificationSystem = await testNotificationSystem();
    await sleep(1000);

    // 11. 测试文件上传
    results.fileUpload = await testFileUpload();
    await sleep(1000);

    // 12. 测试第三方集成
    results.thirdPartyIntegration = await testThirdPartyIntegration();
    await sleep(1000);

    // 13. 清理测试数据
    results.cleanup = await cleanup();

    // 输出测试结果
    console.log("\n📊 === 测试结果汇总 ===");
    console.log("功能模块测试结果:");
    Object.entries(results).forEach(([test, passed]) => {
      const icon = passed ? "✅" : "❌";
      const testName = {
        authentication: "用户认证",
        userManagement: "用户管理",
        contentManagement: "内容管理",
        commentSystem: "评论系统",
        interactionFeatures: "互动功能",
        todoSystem: "待办事项",
        chatSystem: "聊天系统",
        searchFeatures: "搜索功能",
        mobileAPI: "移动端API",
        notificationSystem: "通知系统",
        fileUpload: "文件上传",
        thirdPartyIntegration: "第三方集成",
        cleanup: "数据清理",
      }[test];
      console.log(`${icon} ${testName}`);
    });

    const passedCount = Object.values(results).filter(Boolean).length;
    const totalCount = Object.keys(results).length;

    console.log(
      `\n📈 总体通过率: ${passedCount}/${totalCount} (${((passedCount / totalCount) * 100).toFixed(1)}%)`
    );

    if (passedCount === totalCount) {
      console.log("🎉 所有测试通过！系统运行正常！");
    } else if (passedCount >= totalCount * 0.8) {
      console.log("✨ 大部分测试通过！系统基本正常！");
    } else {
      console.log("⚠️  部分测试失败，请检查服务器状态和配置");
    }

    // 输出详细建议
    const failedTests = Object.entries(results)
      .filter(([_, passed]) => !passed)
      .map(([test]) => test);

    if (failedTests.length > 0) {
      console.log("\n🔧 需要检查的功能模块:");
      failedTests.forEach((test) => {
        const testName = {
          authentication: "用户认证",
          userManagement: "用户管理",
          contentManagement: "内容管理",
          commentSystem: "评论系统",
          interactionFeatures: "互动功能",
          todoSystem: "待办事项",
          chatSystem: "聊天系统",
          searchFeatures: "搜索功能",
          mobileAPI: "移动端API",
          notificationSystem: "通知系统",
          fileUpload: "文件上传",
          thirdPartyIntegration: "第三方集成",
          cleanup: "数据清理",
        }[test];
        console.log(`• ${testName}`);
      });
    }
  } catch (err) {
    error("测试过程中发生意外错误", err);
  }

  console.log("\n🏁 === 测试完成 ===");
}

// 运行测试
if (require.main === module) {
  runAllTests().catch(console.error);
}

module.exports = {
  runAllTests,
};
