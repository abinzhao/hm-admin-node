/**
 * 基础API测试脚本 - HM程序员社区
 * 测试核心API接口的基本功能
 */

const axios = require("axios");

const BASE_URL = "http://localhost:3000/api";
const TEST_USER = {
  username: "basictest2024",
  email: "basictest2024@example.com",
  password: "TestPass123!",
  nickname: "基础测试用户",
};

let authToken = "";
let testUserId = "";

// HTTP客户端配置
const api = axios.create({
  baseURL: BASE_URL,
  timeout: 10000,
});

// 请求拦截器
api.interceptors.request.use((config) => {
  if (authToken) {
    config.headers.Authorization = `Bearer ${authToken}`;
  }
  return config;
});

/**
 * 工具函数
 */
function log(message) {
  console.log(`🔍 ${message}`);
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
 * 测试基础功能
 */
async function runBasicTests() {
  console.log("🚀 === HM程序员社区基础API测试开始 ===");
  console.log(`🌐 测试服务器: ${BASE_URL}`);
  console.log(`⏰ 测试时间: ${new Date().toLocaleString()}`);

  const results = {};

  try {
    // 1. 测试服务器状态
    console.log("\n📊 === 测试服务器状态 ===");
    try {
      log("检查健康状态...");
      const healthResponse = await api.get("http://localhost:3000/health");
      success("健康检查成功", {
        status: healthResponse.data.status,
        uptime: healthResponse.data.uptime,
      });

      log("检查详细状态...");
      const statusResponse = await api.get("/status");
      success("状态检查成功", {
        database: statusResponse.data.database.status,
        memory: statusResponse.data.memory.rss,
      });
      results.serverStatus = true;
    } catch (err) {
      error("服务器状态测试失败", err);
      results.serverStatus = false;
    }

    // 2. 测试用户认证
    console.log("\n🔐 === 测试用户认证 ===");
    try {
      log("注册新用户...");
      try {
        const registerResponse = await api.post("/auth/register", TEST_USER);
        success("用户注册成功");
        authToken = registerResponse.data.data.accessToken;
        testUserId = registerResponse.data.data.user.id;
      } catch (err) {
        if (err.response?.data?.message?.includes("已被注册")) {
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

      log("获取用户信息...");
      const profileResponse = await api.get("/auth/profile");
      success("获取用户信息成功", {
        id: profileResponse.data.data.id,
        nickname: profileResponse.data.data.nickname,
      });
      results.authentication = true;
    } catch (err) {
      error("用户认证测试失败", err);
      results.authentication = false;
    }

    // 如果认证失败，跳过其他需要认证的测试
    if (!results.authentication) {
      console.log("\n⚠️ 认证失败，跳过需要认证的测试");
    } else {
      // 3. 测试内容管理
      console.log("\n📝 === 测试内容管理 ===");
      try {
        log("获取分类列表...");
        const categoriesResponse = await api.get("/content/categories");
        success("获取分类列表成功", {
          count: categoriesResponse.data.data.length,
        });

        log("获取标签列表...");
        const tagsResponse = await api.get("/content/tags");
        success("获取标签列表成功", {
          count: tagsResponse.data.data.length,
        });

        log("获取内容列表...");
        const contentsResponse = await api.get("/content?page=1&limit=5");
        success("获取内容列表成功", {
          count: contentsResponse.data.data.contents.length,
        });

        results.contentManagement = true;
      } catch (err) {
        error("内容管理测试失败", err);
        results.contentManagement = false;
      }

      // 4. 测试用户管理
      console.log("\n👤 === 测试用户管理 ===");
      try {
        log("获取用户列表...");
        const usersResponse = await api.get("/users?page=1&limit=5");
        success("获取用户列表成功", {
          count: usersResponse.data.data.users.length,
        });

        log("获取用户详情...");
        const userDetailResponse = await api.get(`/users/${testUserId}`);
        success("获取用户详情成功", {
          id: userDetailResponse.data.data.id,
          nickname: userDetailResponse.data.data.nickname,
        });

        results.userManagement = true;
      } catch (err) {
        error("用户管理测试失败", err);
        results.userManagement = false;
      }

      // 5. 测试搜索功能
      console.log("\n🔍 === 测试搜索功能 ===");
      try {
        log("测试全局搜索...");
        const searchResponse = await api.get("/search?keyword=test&limit=5");
        success("全局搜索成功", {
          totalResults: searchResponse.data.data.summary?.total || 0,
        });

        log("获取热门搜索...");
        const trendingResponse = await api.get("/search/trending?limit=5");
        success("获取热门搜索成功", {
          count: trendingResponse.data.data.length,
        });

        results.searchFeatures = true;
      } catch (err) {
        error("搜索功能测试失败", err);
        results.searchFeatures = false;
      }

      // 6. 测试通知系统
      console.log("\n🔔 === 测试通知系统 ===");
      try {
        log("获取通知列表...");
        const notificationsResponse = await api.get("/notifications?limit=5");
        success("获取通知列表成功", {
          count: notificationsResponse.data.data.notifications.length,
        });

        log("获取未读通知数量...");
        const unreadResponse = await api.get("/notifications/unread-count");
        success("获取未读通知数量成功", {
          count: unreadResponse.data.data.count,
        });

        results.notifications = true;
      } catch (err) {
        error("通知系统测试失败", err);
        results.notifications = false;
      }

      // 7. 测试文件上传
      console.log("\n📁 === 测试文件上传 ===");
      try {
        log("获取上传配置...");
        const configResponse = await api.get("/upload/config");
        success("获取上传配置成功", {
          maxSize: configResponse.data.data.maxSize,
          allowedTypes: configResponse.data.data.allowedTypes.slice(0, 3),
        });

        log("获取用户文件列表...");
        const filesResponse = await api.get("/upload/files?limit=5");
        success("获取文件列表成功", {
          count: filesResponse.data.data.files.length,
        });

        results.fileUpload = true;
      } catch (err) {
        error("文件上传测试失败", err);
        results.fileUpload = false;
      }

      // 8. 测试第三方集成（基础功能）
      console.log("\n🔗 === 测试第三方集成 ===");
      try {
        log("发送短信验证码（模拟）...");
        const smsResponse = await api.post("/auth/sms/send", {
          phone: "13912345678",
          type: "test",
        });
        success("短信验证码发送成功", {
          expireMinutes: smsResponse.data.data.expireMinutes,
        });

        results.thirdPartyIntegration = true;
      } catch (err) {
        error("第三方集成测试失败", err);
        results.thirdPartyIntegration = false;
      }
    }

    // 输出测试结果
    console.log("\n📊 === 测试结果汇总 ===");
    console.log("功能模块测试结果:");

    const testNames = {
      serverStatus: "服务器状态",
      authentication: "用户认证",
      contentManagement: "内容管理",
      userManagement: "用户管理",
      searchFeatures: "搜索功能",
      notifications: "通知系统",
      fileUpload: "文件上传",
      thirdPartyIntegration: "第三方集成",
    };

    Object.entries(results).forEach(([test, passed]) => {
      const icon = passed ? "✅" : "❌";
      const testName = testNames[test] || test;
      console.log(`${icon} ${testName}`);
    });

    const passedCount = Object.values(results).filter(Boolean).length;
    const totalCount = Object.keys(results).length;

    console.log(
      `\n📈 总体通过率: ${passedCount}/${totalCount} (${((passedCount / totalCount) * 100).toFixed(1)}%)`
    );

    if (passedCount === totalCount) {
      console.log("🎉 所有基础测试通过！系统运行正常！");
    } else if (passedCount >= totalCount * 0.7) {
      console.log("✨ 大部分测试通过！系统基本正常！");
    } else {
      console.log("⚠️ 多个测试失败，需要检查系统配置");
    }

    // 输出建议
    const failedTests = Object.entries(results)
      .filter(([_, passed]) => !passed)
      .map(([test]) => testNames[test] || test);

    if (failedTests.length > 0) {
      console.log("\n🔧 需要检查的功能模块:");
      failedTests.forEach((testName) => {
        console.log(`• ${testName}`);
      });
    }
  } catch (err) {
    error("测试过程中发生意外错误", err);
  }

  console.log("\n🏁 === 基础测试完成 ===");
}

// 运行测试
if (require.main === module) {
  runBasicTests().catch(console.error);
}

module.exports = {
  runBasicTests,
};
