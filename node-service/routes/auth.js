const express = require("express");
const router = express.Router();
const authController = require("../controllers/authController");
const {
  requireAuth,
  loginLimiter,
  registerLimiter,
  verificationLimiter,
} = require("../middlewares/auth");

// 注册相关路由
router.post("/register", (req, res) => authController.register(req, res)); // 临时移除限流器

// 登录相关路由
router.post("/login", (req, res) => authController.login(req, res)); // 临时移除限流器
router.post("/test-login", (req, res) => authController.login(req, res)); // 测试路由
router.post("/refresh-token", (req, res) => authController.refreshToken(req, res));
router.post("/logout", requireAuth, (req, res) => authController.logout(req, res));

// 密码相关路由
router.post("/forgot-password", verificationLimiter, (req, res) =>
  authController.forgotPassword(req, res)
);
router.post("/reset-password", (req, res) => authController.resetPassword(req, res));
router.post("/change-password", requireAuth, (req, res) => authController.changePassword(req, res));

// 用户信息路由
router.get("/profile", requireAuth, (req, res) => authController.getProfile(req, res));

// 第三方登录路由
router.get("/oauth/:provider/url", (req, res) => authController.getOAuthUrl(req, res));
router.get("/oauth/:provider/callback", (req, res) => authController.oauthCallback(req, res));

// 短信验证码相关路由
router.post("/sms/send", (req, res) => authController.sendSmsCode(req, res));
router.post("/sms/login", (req, res) => authController.smsLogin(req, res));
router.post("/sms/register", (req, res) => authController.smsRegister(req, res));

// 第三方账户管理（需要认证）
router.get("/oauth/accounts", requireAuth, (req, res) => authController.getOAuthAccounts(req, res));
router.post("/oauth/:provider/bind", requireAuth, (req, res) =>
  authController.bindOAuthAccount(req, res)
);
router.delete("/oauth/:provider/unbind", requireAuth, (req, res) =>
  authController.unbindOAuthAccount(req, res)
);

// 手机号绑定（需要认证）
router.post("/phone/bind", requireAuth, (req, res) => authController.bindPhone(req, res));

// 测试路由
router.get("/test", (req, res) => {
  res.json({ success: true, message: "API路由正常工作", timestamp: new Date() });
});

module.exports = router;
