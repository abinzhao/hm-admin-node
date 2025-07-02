#!/usr/bin/env node

const axios = require("axios");

const BASE_URL = "http://localhost:3001";
let authToken = "";

// 创建axios实例
const api = axios.create({
  baseURL: BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// 颜色输出
const colors = {
  green: "\x1b[32m",
  red: "\x1b[31m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  reset: "\x1b[0m",
};

function log(message, color = "reset") {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

// 测试函数
async function testAPI() {
  log("\n🧪 开始API测试\n", "blue");

  try {
    // 1. 测试健康检查
    log("1. 测试健康检查接口...", "yellow");
    const healthResponse = await api.get("/health");
    log(`✅ 健康检查成功: ${healthResponse.data.status}`, "green");

    // 2. 测试用户注册
    log("\n2. 测试用户注册接口...", "yellow");
    const registerData = {
      username: "testuser" + Date.now(),
      email: `test${Date.now()}@example.com`,
      password: "Test123456",
      nickname: "测试用户",
    };

    try {
      const registerResponse = await api.post("/api/auth/register", registerData);
      log("✅ 用户注册成功", "green");
      log(`   用户ID: ${registerResponse.data.data.user.id}`, "green");
      authToken = registerResponse.data.data.accessToken;
    } catch (error) {
      if (error.response) {
        log(`❌ 注册失败: ${error.response.data.message || error.response.statusText}`, "red");
      } else {
        log(`❌ 注册失败: ${error.message}`, "red");
      }
    }

    // 3. 测试管理员登录
    log("\n3. 测试管理员登录接口...", "yellow");
    const loginData = {
      email: "admin@hm.com",
      password: "123456",
    };

    try {
      const loginResponse = await api.post("/api/auth/login", loginData);
      log("✅ 管理员登录成功", "green");
      log(`   角色: ${loginResponse.data.data.user.role}`, "green");
      authToken = loginResponse.data.data.accessToken; // 使用管理员token
    } catch (error) {
      if (error.response) {
        log(`❌ 登录失败: ${error.response.data.message || error.response.statusText}`, "red");
      } else {
        log(`❌ 登录失败: ${error.message}`, "red");
      }
    }

    // 4. 测试获取用户信息
    if (authToken) {
      log("\n4. 测试获取用户信息接口...", "yellow");
      try {
        const profileResponse = await api.get("/api/auth/profile", {
          headers: { Authorization: `Bearer ${authToken}` },
        });
        log("✅ 获取用户信息成功", "green");
        log(`   用户: ${profileResponse.data.data.nickname}`, "green");
      } catch (error) {
        if (error.response) {
          log(
            `❌ 获取用户信息失败: ${error.response.data.message || error.response.statusText}`,
            "red"
          );
        } else {
          log(`❌ 获取用户信息失败: ${error.message}`, "red");
        }
      }
    }

    // 5. 测试内容列表
    log("\n5. 测试内容列表接口...", "yellow");
    try {
      const contentResponse = await api.get("/api/content?page=1&limit=5");
      log("✅ 获取内容列表成功", "green");
      log(`   内容数量: ${contentResponse.data.data.contents.length}`, "green");
    } catch (error) {
      if (error.response) {
        log(
          `❌ 获取内容列表失败: ${error.response.data.message || error.response.statusText}`,
          "red"
        );
      } else {
        log(`❌ 获取内容列表失败: ${error.message}`, "red");
      }
    }

    // 6. 测试API文档页面
    log("\n6. 测试API文档页面...", "yellow");
    try {
      const docsResponse = await api.get("/api-docs");
      if (docsResponse.status === 200) {
        log("✅ API文档页面正常", "green");
      }
    } catch (error) {
      log(`❌ API文档页面失败: ${error.message}`, "red");
    }

    // 7. 测试静态站点
    log("\n7. 测试静态站点...", "yellow");
    try {
      const siteResponse = await api.get("/");
      if (siteResponse.status === 200) {
        log("✅ 静态站点正常", "green");
      }
    } catch (error) {
      log(`❌ 静态站点失败: ${error.message}`, "red");
    }

    log("\n🎉 API测试完成！", "blue");
  } catch (error) {
    log(`\n❌ 测试过程中发生错误: ${error.message}`, "red");
  }
}

// 运行测试
testAPI().catch(console.error);
