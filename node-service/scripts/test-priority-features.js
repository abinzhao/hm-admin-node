#!/usr/bin/env node

/**
 * 优先功能测试脚本
 * 测试Todo、文件上传、用户管理、搜索功能
 */

const axios = require("axios");
const FormData = require("form-data");
const fs = require("fs");
const path = require("path");

const BASE_URL = "http://localhost:3001/api";
let authToken = "";

// 颜色输出
const colors = {
  green: "\x1b[32m",
  red: "\x1b[31m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  reset: "\x1b[0m",
};

const log = {
  success: (msg) => console.log(`${colors.green}✅ ${msg}${colors.reset}`),
  error: (msg) => console.log(`${colors.red}❌ ${msg}${colors.reset}`),
  warn: (msg) => console.log(`${colors.yellow}⚠️  ${msg}${colors.reset}`),
  info: (msg) => console.log(`${colors.blue}ℹ️  ${msg}${colors.reset}`),
};

// API请求封装
const api = axios.create({
  baseURL: BASE_URL,
  timeout: 30000, // 增加超时时间到30秒
});

// 请求拦截器 - 添加认证
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
    if (error.response) {
      throw new Error(
        `${error.response.status}: ${error.response.data.message || error.response.statusText}`
      );
    }
    throw error;
  }
);

/**
 * 1. 用户登录
 */
async function testLogin() {
  try {
    log.info("开始测试用户登录...");

    const response = await api.post("/auth/login", {
      email: "admin@hm.com",
      password: "123456",
    });

    if (response.data.success && response.data.data.accessToken) {
      authToken = response.data.data.accessToken;
      log.success("用户登录成功");
      return true;
    } else {
      throw new Error("登录响应格式错误");
    }
  } catch (error) {
    log.error(`用户登录失败: ${error.message}`);
    return false;
  }
}

/**
 * 2. Todo待办事项测试
 */
async function testTodoFeatures() {
  try {
    log.info("开始测试Todo待办事项功能...");

    // 创建待办事项
    const createResponse = await api.post("/todos", {
      title: "测试待办事项",
      description: "这是一个测试用的待办事项",
      priority: "high",
      category: "工作",
      due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    });

    if (!createResponse.data.success) {
      throw new Error("创建待办事项失败");
    }

    const todoId = createResponse.data.data.todo.id;
    log.success(`创建待办事项成功，ID: ${todoId}`);

    // 获取待办事项列表
    const listResponse = await api.get("/todos");
    if (!listResponse.data.success || !Array.isArray(listResponse.data.data.todos)) {
      throw new Error("获取待办事项列表失败");
    }
    log.success(`获取待办事项列表成功，共 ${listResponse.data.data.todos.length} 条`);

    // 更新待办事项
    const updateResponse = await api.put(`/todos/${todoId}`, {
      status: "in_progress",
      progress: 50,
    });
    if (!updateResponse.data.success) {
      throw new Error("更新待办事项失败");
    }
    log.success("更新待办事项成功");

    // 获取统计信息
    const statsResponse = await api.get("/todos/stats");
    if (!statsResponse.data.success) {
      throw new Error("获取待办事项统计失败");
    }
    log.success("获取待办事项统计成功");

    log.success("Todo待办事项功能测试通过");
    return true;
  } catch (error) {
    log.error(`Todo功能测试失败: ${error.message}`);
    return false;
  }
}

/**
 * 3. 文件上传测试
 */
async function testUploadFeatures() {
  try {
    log.info("开始测试文件上传功能...");

    // 创建测试文件
    const testFile = path.join(__dirname, "test-file.txt");
    fs.writeFileSync(testFile, "This is a test file for upload feature testing.");

    // 获取上传配置
    const configResponse = await api.get("/upload/config");
    if (!configResponse.data.success) {
      throw new Error("获取上传配置失败");
    }
    log.success("获取上传配置成功");

    // 文件上传
    const form = new FormData();
    form.append("files", fs.createReadStream(testFile));
    form.append("related_type", "test");
    form.append("is_public", "true");

    const uploadResponse = await api.post("/upload", form, {
      headers: {
        ...form.getHeaders(),
        Authorization: `Bearer ${authToken}`,
      },
    });

    if (!uploadResponse.data.success || !uploadResponse.data.data.files.length) {
      throw new Error("文件上传失败");
    }

    const fileId = uploadResponse.data.data.files[0].id;
    log.success(`文件上传成功，ID: ${fileId}`);

    // 获取文件列表
    const filesResponse = await api.get("/upload/files");
    if (!filesResponse.data.success) {
      throw new Error("获取文件列表失败");
    }
    log.success(`获取文件列表成功，共 ${filesResponse.data.data.files.length} 个文件`);

    // 获取存储统计
    const statsResponse = await api.get("/upload/stats");
    if (!statsResponse.data.success) {
      throw new Error("获取存储统计失败");
    }
    log.success("获取存储统计成功");

    // 清理测试文件
    fs.unlinkSync(testFile);

    log.success("文件上传功能测试通过");
    return true;
  } catch (error) {
    log.error(`文件上传功能测试失败: ${error.message}`);
    return false;
  }
}

/**
 * 4. 用户管理测试
 */
async function testUserManagement() {
  try {
    log.info("开始测试用户管理功能...");

    // 获取用户列表（管理员功能）
    const usersResponse = await api.get("/users");
    if (!usersResponse.data.success || !Array.isArray(usersResponse.data.data.users)) {
      throw new Error("获取用户列表失败");
    }
    log.success(`获取用户列表成功，共 ${usersResponse.data.data.users.length} 个用户`);

    // 获取用户统计
    const statsResponse = await api.get("/users/stats");
    if (!statsResponse.data.success) {
      throw new Error("获取用户统计失败");
    }
    log.success("获取用户统计成功");

    // 获取当前用户详情
    const adminUser = usersResponse.data.data.users.find((u) => u.email === "admin@hm.com");
    if (!adminUser) {
      throw new Error("找不到管理员用户");
    }

    const userDetailResponse = await api.get(`/users/${adminUser.id}`);
    if (!userDetailResponse.data.success) {
      throw new Error("获取用户详情失败");
    }
    log.success("获取用户详情成功");

    log.success("用户管理功能测试通过");
    return true;
  } catch (error) {
    log.error(`用户管理功能测试失败: ${error.message}`);
    return false;
  }
}

/**
 * 5. 搜索功能测试
 */
async function testSearchFeatures() {
  try {
    log.info("开始测试搜索功能...");

    // 全局搜索
    const globalSearchResponse = await api.get("/search", {
      params: {
        q: "测试",
        type: "all",
        limit: 10,
      },
    });
    if (!globalSearchResponse.data.success) {
      throw new Error("全局搜索失败");
    }
    log.success("全局搜索功能正常");

    // 搜索建议
    const suggestionsResponse = await api.get("/search/suggestions", {
      params: { q: "test" },
    });
    if (!suggestionsResponse.data.success) {
      throw new Error("搜索建议失败");
    }
    log.success("搜索建议功能正常");

    // 热门搜索
    const trendingResponse = await api.get("/search/trending");
    if (!trendingResponse.data.success) {
      throw new Error("热门搜索失败");
    }
    log.success("热门搜索功能正常");

    // 高级搜索
    const advancedSearchResponse = await api.post("/search/advanced", {
      query: "开发",
      content_type: "article",
      sort_by: "created_at",
      page: 1,
      limit: 10,
    });
    if (!advancedSearchResponse.data.success) {
      throw new Error("高级搜索失败");
    }
    log.success("高级搜索功能正常");

    log.success("搜索功能测试通过");
    return true;
  } catch (error) {
    log.error(`搜索功能测试失败: ${error.message}`);
    return false;
  }
}

/**
 * 主测试函数
 */
async function runTests() {
  console.log("\n🚀 开始测试优先功能...\n");

  const results = {
    login: false,
    todo: false,
    upload: false,
    userManagement: false,
    search: false,
  };

  // 1. 用户登录测试
  results.login = await testLogin();
  if (!results.login) {
    log.error("登录失败，无法继续测试其他功能");
    process.exit(1);
  }

  console.log("");

  // 2. Todo待办事项测试
  results.todo = await testTodoFeatures();
  console.log("");

  // 3. 文件上传测试
  results.upload = await testUploadFeatures();
  console.log("");

  // 4. 用户管理测试
  results.userManagement = await testUserManagement();
  console.log("");

  // 5. 搜索功能测试
  results.search = await testSearchFeatures();
  console.log("");

  // 测试结果汇总
  console.log("📊 测试结果汇总:");
  console.log("=".repeat(50));

  const testItems = [
    { name: "用户登录", key: "login" },
    { name: "Todo待办事项", key: "todo" },
    { name: "文件上传系统", key: "upload" },
    { name: "用户管理", key: "userManagement" },
    { name: "搜索功能", key: "search" },
  ];

  let passedCount = 0;
  testItems.forEach((item) => {
    if (results[item.key]) {
      log.success(`${item.name}: 通过`);
      passedCount++;
    } else {
      log.error(`${item.name}: 失败`);
    }
  });

  console.log("=".repeat(50));
  console.log(`\n🎯 测试完成: ${passedCount}/${testItems.length} 项功能通过\n`);

  if (passedCount === testItems.length) {
    log.success("🎉 所有优先功能测试通过！");
    process.exit(0);
  } else {
    log.warn("⚠️  部分功能测试失败，请检查相关实现");
    process.exit(1);
  }
}

// 错误处理
process.on("unhandledRejection", (error) => {
  log.error(`未处理的Promise拒绝: ${error.message}`);
  process.exit(1);
});

process.on("uncaughtException", (error) => {
  log.error(`未捕获的异常: ${error.message}`);
  process.exit(1);
});

// 执行测试
if (require.main === module) {
  runTests().catch((error) => {
    log.error(`测试执行失败: ${error.message}`);
    process.exit(1);
  });
}

module.exports = { runTests };
