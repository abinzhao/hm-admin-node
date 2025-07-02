/**
 * 短信服务
 * 支持阿里云、腾讯云等短信服务提供商
 */

const crypto = require("crypto");
const axios = require("axios");
const logger = require("../utils/logger");

class SmsService {
  constructor() {
    // 阿里云短信配置
    this.aliyunConfig = {
      accessKeyId: process.env.ALIYUN_ACCESS_KEY_ID,
      accessKeySecret: process.env.ALIYUN_ACCESS_KEY_SECRET,
      signName: process.env.ALIYUN_SMS_SIGN_NAME || "HM程序员社区",
      endpoint: "https://dysmsapi.aliyuncs.com",
    };

    // 腾讯云短信配置
    this.tencentConfig = {
      secretId: process.env.TENCENT_SECRET_ID,
      secretKey: process.env.TENCENT_SECRET_KEY,
      appId: process.env.TENCENT_SMS_APP_ID,
      signName: process.env.TENCENT_SMS_SIGN_NAME || "HM程序员社区",
      endpoint: "https://sms.tencentcloudapi.com",
    };

    // 验证码存储（实际应用中应使用Redis）
    this.verificationCodes = new Map();

    // 验证码配置
    this.codeConfig = {
      length: 6,
      expireMinutes: 5,
      maxAttempts: 3,
      cooldownMinutes: 1, // 发送冷却时间
    };

    // 选择服务提供商
    this.provider = process.env.SMS_PROVIDER || "mock"; // 'aliyun', 'tencent', 'mock'
  }

  /**
   * 发送验证码短信
   */
  async sendVerificationCode(phone, type = "login") {
    try {
      // 验证手机号格式
      if (!this.isValidPhone(phone)) {
        throw new Error("手机号格式不正确");
      }

      // 检查发送频率限制
      const lastSendTime = this.getLastSendTime(phone);
      if (lastSendTime && Date.now() - lastSendTime < this.codeConfig.cooldownMinutes * 60 * 1000) {
        throw new Error(`请等待${this.codeConfig.cooldownMinutes}分钟后再发送`);
      }

      // 生成验证码
      const code = this.generateVerificationCode();

      // 根据类型选择模板
      const templateCode = this.getTemplateCode(type);

      // 发送短信
      let result;
      switch (this.provider) {
        case "aliyun":
          result = await this.sendAliyunSms(phone, templateCode, { code });
          break;
        case "tencent":
          result = await this.sendTencentSms(phone, templateCode, [code]);
          break;
        case "mock":
        default:
          result = await this.sendMockSms(phone, code, type);
          break;
      }

      if (result.success) {
        // 存储验证码
        this.storeVerificationCode(phone, code, type);

        logger.info(`验证码发送成功: ${phone} (类型: ${type})`);

        return {
          success: true,
          message: "验证码发送成功",
          requestId: result.requestId,
          expireMinutes: this.codeConfig.expireMinutes,
        };
      } else {
        throw new Error(result.message);
      }
    } catch (error) {
      logger.error("发送验证码失败:", error);
      throw error;
    }
  }

  /**
   * 验证短信验证码
   */
  async verifyCode(phone, code, type = "login") {
    try {
      const key = `${phone}_${type}`;
      const storedData = this.verificationCodes.get(key);

      if (!storedData) {
        return {
          success: false,
          message: "验证码不存在或已过期",
        };
      }

      // 检查是否过期
      if (Date.now() > storedData.expireAt) {
        this.verificationCodes.delete(key);
        return {
          success: false,
          message: "验证码已过期",
        };
      }

      // 检查尝试次数
      if (storedData.attempts >= this.codeConfig.maxAttempts) {
        this.verificationCodes.delete(key);
        return {
          success: false,
          message: "验证失败次数过多，请重新获取验证码",
        };
      }

      // 验证码匹配
      if (storedData.code === code) {
        this.verificationCodes.delete(key);
        logger.info(`验证码验证成功: ${phone} (类型: ${type})`);
        return {
          success: true,
          message: "验证成功",
        };
      } else {
        // 增加尝试次数
        storedData.attempts += 1;
        this.verificationCodes.set(key, storedData);

        return {
          success: false,
          message: `验证码错误，还可尝试${this.codeConfig.maxAttempts - storedData.attempts}次`,
        };
      }
    } catch (error) {
      logger.error("验证码验证失败:", error);
      throw error;
    }
  }

  /**
   * 发送阿里云短信
   */
  async sendAliyunSms(phone, templateCode, templateParam) {
    try {
      if (!this.aliyunConfig.accessKeyId || !this.aliyunConfig.accessKeySecret) {
        throw new Error("阿里云短信配置不完整");
      }

      const timestamp = new Date().toISOString();
      const nonce = crypto.randomBytes(16).toString("hex");

      const params = {
        AccessKeyId: this.aliyunConfig.accessKeyId,
        Action: "SendSms",
        Format: "JSON",
        PhoneNumbers: phone,
        SignName: this.aliyunConfig.signName,
        TemplateCode: templateCode,
        TemplateParam: JSON.stringify(templateParam),
        Timestamp: timestamp,
        SignatureMethod: "HMAC-SHA1",
        SignatureNonce: nonce,
        SignatureVersion: "1.0",
        Version: "2017-05-25",
      };

      // 生成签名
      const signature = this.generateAliyunSignature(params);
      params.Signature = signature;

      const response = await axios.post(this.aliyunConfig.endpoint, null, {
        params,
        timeout: 10000,
      });

      if (response.data.Code === "OK") {
        return {
          success: true,
          requestId: response.data.RequestId,
        };
      } else {
        return {
          success: false,
          message: response.data.Message || "发送失败",
        };
      }
    } catch (error) {
      logger.error("阿里云短信发送失败:", error);
      return {
        success: false,
        message: "短信服务异常",
      };
    }
  }

  /**
   * 发送腾讯云短信
   */
  async sendTencentSms(phone, templateId, templateParams) {
    try {
      if (!this.tencentConfig.secretId || !this.tencentConfig.secretKey) {
        throw new Error("腾讯云短信配置不完整");
      }

      const timestamp = Math.floor(Date.now() / 1000);
      const date = new Date(timestamp * 1000).toISOString().substr(0, 10);

      const payload = {
        PhoneNumberSet: [`+86${phone}`],
        SmsSdkAppId: this.tencentConfig.appId,
        SignName: this.tencentConfig.signName,
        TemplateId: templateId,
        TemplateParamSet: templateParams,
      };

      const payloadStr = JSON.stringify(payload);

      // 生成签名
      const signature = this.generateTencentSignature(payloadStr, timestamp, date);

      const response = await axios.post(this.tencentConfig.endpoint, payload, {
        headers: {
          Authorization: signature,
          "Content-Type": "application/json",
          Host: "sms.tencentcloudapi.com",
          "X-TC-Action": "SendSms",
          "X-TC-Timestamp": timestamp,
          "X-TC-Version": "2021-01-11",
        },
        timeout: 10000,
      });

      if (response.data.Response.Error) {
        return {
          success: false,
          message: response.data.Response.Error.Message,
        };
      } else {
        return {
          success: true,
          requestId: response.data.Response.RequestId,
        };
      }
    } catch (error) {
      logger.error("腾讯云短信发送失败:", error);
      return {
        success: false,
        message: "短信服务异常",
      };
    }
  }

  /**
   * 模拟短信发送（开发环境使用）
   */
  async sendMockSms(phone, code, type) {
    try {
      logger.info(`模拟短信发送 - 手机号: ${phone}, 验证码: ${code}, 类型: ${type}`);

      // 模拟网络延迟
      await new Promise((resolve) => setTimeout(resolve, 500));

      return {
        success: true,
        requestId: `mock_${Date.now()}`,
      };
    } catch (error) {
      return {
        success: false,
        message: "模拟发送失败",
      };
    }
  }

  /**
   * 生成阿里云签名
   */
  generateAliyunSignature(params) {
    // 按键名排序
    const sortedKeys = Object.keys(params).sort();
    const canonicalQueryString = sortedKeys
      .map((key) => `${this.percentEncode(key)}=${this.percentEncode(params[key])}`)
      .join("&");

    const stringToSign = `POST&${this.percentEncode("/")}&${this.percentEncode(canonicalQueryString)}`;

    const hmac = crypto.createHmac("sha1", this.aliyunConfig.accessKeySecret + "&");
    hmac.update(stringToSign);

    return hmac.digest("base64");
  }

  /**
   * 生成腾讯云签名
   */
  generateTencentSignature(payload, timestamp, date) {
    const algorithm = "TC3-HMAC-SHA256";
    const service = "sms";
    const version = "2021-01-11";
    const action = "SendSms";
    const region = "ap-beijing";

    // 步骤1: 拼接规范请求串
    const hashedRequestPayload = crypto.createHash("sha256").update(payload).digest("hex");
    const canonicalRequest = [
      "POST",
      "/",
      "",
      "content-type:application/json",
      "host:sms.tencentcloudapi.com",
      "",
      "content-type;host",
      hashedRequestPayload,
    ].join("\n");

    // 步骤2: 拼接待签名字符串
    const credentialScope = `${date}/${service}/tc3_request`;
    const hashedCanonicalRequest = crypto
      .createHash("sha256")
      .update(canonicalRequest)
      .digest("hex");
    const stringToSign = [algorithm, timestamp, credentialScope, hashedCanonicalRequest].join("\n");

    // 步骤3: 计算签名
    const secretDate = crypto
      .createHmac("sha256", `TC3${this.tencentConfig.secretKey}`)
      .update(date)
      .digest();
    const secretService = crypto.createHmac("sha256", secretDate).update(service).digest();
    const secretSigning = crypto.createHmac("sha256", secretService).update("tc3_request").digest();
    const signature = crypto.createHmac("sha256", secretSigning).update(stringToSign).digest("hex");

    // 步骤4: 拼接Authorization
    const authorization = `${algorithm} Credential=${this.tencentConfig.secretId}/${credentialScope}, SignedHeaders=content-type;host, Signature=${signature}`;

    return authorization;
  }

  /**
   * URL编码（阿里云专用）
   */
  percentEncode(str) {
    return encodeURIComponent(str)
      .replace(/!/g, "%21")
      .replace(/'/g, "%27")
      .replace(/\(/g, "%28")
      .replace(/\)/g, "%29")
      .replace(/\*/g, "%2A");
  }

  /**
   * 生成验证码
   */
  generateVerificationCode() {
    const min = Math.pow(10, this.codeConfig.length - 1);
    const max = Math.pow(10, this.codeConfig.length) - 1;
    return Math.floor(Math.random() * (max - min + 1) + min).toString();
  }

  /**
   * 存储验证码
   */
  storeVerificationCode(phone, code, type) {
    const key = `${phone}_${type}`;
    const expireAt = Date.now() + this.codeConfig.expireMinutes * 60 * 1000;

    this.verificationCodes.set(key, {
      code,
      type,
      phone,
      expireAt,
      attempts: 0,
      createdAt: Date.now(),
    });

    // 设置自动清理
    setTimeout(
      () => {
        this.verificationCodes.delete(key);
      },
      this.codeConfig.expireMinutes * 60 * 1000
    );
  }

  /**
   * 获取上次发送时间
   */
  getLastSendTime(phone) {
    // 遍历所有验证码记录，找到该手机号的最新记录
    let lastTime = 0;
    for (const [key, data] of this.verificationCodes.entries()) {
      if (data.phone === phone && data.createdAt > lastTime) {
        lastTime = data.createdAt;
      }
    }
    return lastTime;
  }

  /**
   * 验证手机号格式
   */
  isValidPhone(phone) {
    const phoneRegex = /^1[3-9]\d{9}$/;
    return phoneRegex.test(phone);
  }

  /**
   * 根据类型获取模板代码
   */
  getTemplateCode(type) {
    const templates = {
      login: process.env.SMS_TEMPLATE_LOGIN || "SMS_123456789", // 登录验证
      register: process.env.SMS_TEMPLATE_REGISTER || "SMS_123456790", // 注册验证
      reset_password: process.env.SMS_TEMPLATE_RESET || "SMS_123456791", // 密码重置
      bind_phone: process.env.SMS_TEMPLATE_BIND || "SMS_123456792", // 绑定手机
      security: process.env.SMS_TEMPLATE_SECURITY || "SMS_123456793", // 安全验证
    };

    return templates[type] || templates["login"];
  }

  /**
   * 清理过期验证码
   */
  cleanupExpiredCodes() {
    const now = Date.now();
    for (const [key, data] of this.verificationCodes.entries()) {
      if (now > data.expireAt) {
        this.verificationCodes.delete(key);
      }
    }
  }

  /**
   * 获取验证码统计信息
   */
  getStats() {
    const now = Date.now();
    const activeCount = Array.from(this.verificationCodes.values()).filter(
      (data) => now < data.expireAt
    ).length;

    return {
      totalCodes: this.verificationCodes.size,
      activeCodes: activeCount,
      expiredCodes: this.verificationCodes.size - activeCount,
    };
  }
}

module.exports = new SmsService();
