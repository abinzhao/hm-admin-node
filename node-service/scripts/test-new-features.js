/**
 * 新功能测试脚本
 * 测试实时聊天、移动端优化、第三方集成功能
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
let testChatId = "";
let testMessageId = "";

// HTTP客户端配置
const api = axios.create({
  baseURL: BASE_URL,
  timeout: 10000,
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
    console.log(err.response?.data || err.message);
  }
}

async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * 1. 测试用户认证
 */
async function testAuthentication() {
  console.log("\n📝 === 测试用户认证 ===");

  try {
    // 1.1 用户注册
    log("注册测试用户...");
    try {
      const registerResponse = await api.post("/auth/register", TEST_USER);
      success("用户注册成功", {
        user: registerResponse.data.data.user.nickname,
        hasToken: !!registerResponse.data.data.accessToken,
      });
      authToken = registerResponse.data.data.accessToken;
    } catch (err) {
      if (err.response?.status === 400 && err.response?.data?.message?.includes("已被注册")) {
        log("用户已存在，尝试登录...");
        const loginResponse = await api.post("/auth/login", {
          email: TEST_USER.email,
          password: TEST_USER.password,
        });
        success("用户登录成功");
        authToken = loginResponse.data.data.accessToken;
      } else {
        throw err;
      }
    }

    // 1.2 获取用户信息
    log("获取用户信息...");
    const profileResponse = await api.get("/auth/profile");
    success("获取用户信息成功", {
      id: profileResponse.data.data.id,
      nickname: profileResponse.data.data.nickname,
      email: profileResponse.data.data.email,
    });

    return true;
  } catch (err) {
    error("用户认证测试失败", err);
    return false;
  }
}

/**
 * 2. 测试短信验证码功能
 */
async function testSmsFeatures() {
  console.log("\n📱 === 测试短信验证码功能 ===");

  try {
    // 2.1 发送验证码（模拟）
    log("发送短信验证码...");
    const smsResponse = await api.post("/auth/sms/send", {
      phone: "13912345678",
      type: "register",
    });
    success("短信验证码发送成功", {
      expireMinutes: smsResponse.data.data.expireMinutes,
      requestId: smsResponse.data.data.requestId,
    });

    // 2.2 获取第三方登录URL
    log("获取微信登录URL...");
    const wechatUrlResponse = await api.get("/auth/oauth/wechat/url?state=test123");
    success("获取微信登录URL成功", {
      provider: wechatUrlResponse.data.data.provider,
      hasAuthUrl: !!wechatUrlResponse.data.data.authUrl,
    });

    // 2.3 获取QQ登录URL
    log("获取QQ登录URL...");
    const qqUrlResponse = await api.get("/auth/oauth/qq/url?state=test456");
    success("获取QQ登录URL成功", {
      provider: qqUrlResponse.data.data.provider,
      hasAuthUrl: !!qqUrlResponse.data.data.authUrl,
    });

    return true;
  } catch (err) {
    error("短信功能测试失败", err);
    return false;
  }
}

/**
 * 3. 测试聊天功能
 */
async function testChatFeatures() {
  console.log("\n💬 === 测试聊天功能 ===");

  try {
    // 3.1 获取聊天列表
    log("获取聊天列表...");
    const chatsResponse = await api.get("/chats");
    success("获取聊天列表成功", {
      count: chatsResponse.data.data.chats.length,
      pagination: chatsResponse.data.data.pagination,
    });

    // 3.2 创建群聊
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
      type: createChatResponse.data.data.chat.type,
    });
    testChatId = createChatResponse.data.data.chat.id;

    // 3.3 发送消息
    log("发送测试消息...");
    const messageResponse = await api.post(`/chats/${testChatId}/messages`, {
      type: "text",
      content: "这是一条测试消息！Hello World! 🎉",
    });
    success("发送消息成功", {
      messageId: messageResponse.data.data.message.id,
      content: messageResponse.data.data.message.content,
      type: messageResponse.data.data.message.type,
    });
    testMessageId = messageResponse.data.data.message.id;

    // 3.4 获取消息列表
    log("获取消息列表...");
    const messagesResponse = await api.get(`/chats/${testChatId}/messages`);
    success("获取消息列表成功", {
      count: messagesResponse.data.data.messages.length,
      latestMessage: messagesResponse.data.data.messages[0]?.content,
    });

    // 3.5 获取聊天详情
    log("获取聊天详情...");
    const chatDetailResponse = await api.get(`/chats/${testChatId}`);
    success("获取聊天详情成功", {
      name: chatDetailResponse.data.data.chat.name,
      membersCount: chatDetailResponse.data.data.chat.members?.length || 0,
      messageCount: chatDetailResponse.data.data.chat.message_count,
    });

    return true;
  } catch (err) {
    error("聊天功能测试失败", err);
    return false;
  }
}

/**
 * 4. 测试移动端API
 */
async function testMobileAPI() {
  console.log("\n📱 === 测试移动端API ===");

  try {
    // 4.1 获取首页数据
    log("获取移动端首页数据...");
    const homeResponse = await api.get(
      "/mobile/home?include_chats=true&include_todos=true&include_notifications=true"
    );
    success("获取首页数据成功", {
      hasUser: !!homeResponse.data.data.user,
      contentsCount: homeResponse.data.data.recentContents?.length || 0,
      stats: homeResponse.data.data.stats,
    });

    // 4.2 网络状态检测
    log("网络状态检测...");
    const networkResponse = await api.get("/mobile/network");
    success("网络状态检测成功", {
      latency: networkResponse.data.data.latency,
      quality: networkResponse.data.data.quality,
    });

    // 4.3 设备信息上报
    log("上报设备信息...");
    const deviceResponse = await api.post("/mobile/device", {
      device_type: "ios",
      os_version: "17.0",
      app_version: "1.0.0",
      device_id: "test-device-12345",
      timezone: "Asia/Shanghai",
      language: "zh-CN",
      network_type: "wifi",
    });
    success("设备信息上报成功", {
      userId: deviceResponse.data.data.userId,
      reportTime: deviceResponse.data.data.reportTime,
    });

    // 4.4 轻量级搜索
    log("测试轻量级搜索...");
    const searchResponse = await api.get("/mobile/search?keyword=测试&limit=5");
    success("轻量级搜索成功", {
      usersCount: searchResponse.data.data.users?.length || 0,
      contentsCount: searchResponse.data.data.contents?.length || 0,
      chatsCount: searchResponse.data.data.chats?.length || 0,
    });

    // 4.5 批量操作测试
    log("测试批量操作...");
    const batchResponse = await api.post("/mobile/batch", {
      operations: [
        {
          type: "pin_chat",
          chat_id: testChatId,
          pinned: true,
        },
        {
          type: "pin_chat",
          chat_id: testChatId,
          pinned: false,
        },
      ],
    });
    success("批量操作成功", {
      successCount: batchResponse.data.data.successCount,
      totalCount: batchResponse.data.data.totalCount,
    });

    return true;
  } catch (err) {
    error("移动端API测试失败", err);
    return false;
  }
}

/**
 * 5. 测试搜索功能
 */
async function testSearchFeatures() {
  console.log("\n🔍 === 测试搜索功能 ===");

  try {
    // 5.1 全局搜索
    log("测试全局搜索...");
    const globalSearchResponse = await api.get("/search?keyword=测试&page=1&limit=10");
    success("全局搜索成功", {
      usersCount: globalSearchResponse.data.data.users?.length || 0,
      contentsCount: globalSearchResponse.data.data.contents?.length || 0,
      totalResults: globalSearchResponse.data.data.summary?.total || 0,
    });

    // 5.2 热门搜索
    log("获取热门搜索...");
    const hotSearchResponse = await api.get("/search/trending?limit=10");
    success("获取热门搜索成功", {
      count: hotSearchResponse.data.data.length,
    });

    // 5.3 搜索建议
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
 * 6. 清理测试数据
 */
async function cleanup() {
  console.log("\n🧹 === 清理测试数据 ===");

  try {
    // 删除测试消息（如果存在）
    if (testChatId && testMessageId) {
      log("删除测试消息...");
      try {
        await api.delete(`/chats/${testChatId}/messages/${testMessageId}`);
        success("测试消息删除成功");
      } catch (err) {
        log("测试消息可能已不存在，跳过删除");
      }
    }

    log("测试完成，清理结束");
    return true;
  } catch (err) {
    error("清理测试数据失败", err);
    return false;
  }
}

/**
 * 主测试函数
 */
async function runTests() {
  console.log("🚀 === HM程序员社区新功能测试开始 ===");
  console.log(`🌐 测试服务器: ${BASE_URL}`);
  console.log(`⏰ 测试时间: ${new Date().toLocaleString()}`);

  const results = {
    authentication: false,
    smsFeatures: false,
    chatFeatures: false,
    mobileAPI: false,
    searchFeatures: false,
    cleanup: false,
  };

  try {
    // 1. 测试用户认证
    results.authentication = await testAuthentication();
    await sleep(1000);

    // 2. 测试短信功能
    results.smsFeatures = await testSmsFeatures();
    await sleep(1000);

    // 3. 测试聊天功能
    results.chatFeatures = await testChatFeatures();
    await sleep(1000);

    // 4. 测试移动端API
    results.mobileAPI = await testMobileAPI();
    await sleep(1000);

    // 5. 测试搜索功能
    results.searchFeatures = await testSearchFeatures();
    await sleep(1000);

    // 6. 清理测试数据
    results.cleanup = await cleanup();

    // 输出测试结果
    console.log("\n📊 === 测试结果汇总 ===");
    console.log("✅ 通过的测试:");
    Object.entries(results).forEach(([test, passed]) => {
      const icon = passed ? "✅" : "❌";
      const testName = {
        authentication: "用户认证",
        smsFeatures: "短信功能",
        chatFeatures: "聊天功能",
        mobileAPI: "移动端API",
        searchFeatures: "搜索功能",
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
      console.log("🎉 所有测试通过！新功能运行正常！");
    } else {
      console.log("⚠️  部分测试失败，请检查服务器状态和配置");
    }
  } catch (err) {
    error("测试过程中发生意外错误", err);
  }

  console.log("\n🏁 === 测试完成 ===");
}

// 运行测试
if (require.main === module) {
  runTests().catch(console.error);
}

module.exports = {
  runTests,
  testAuthentication,
  testSmsFeatures,
  testChatFeatures,
  testMobileAPI,
  testSearchFeatures,
};
