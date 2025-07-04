// controllers/userController.js
// 用户相关控制器
const { User } = require("../models");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");

/**
 * 用户注册
 * @param {string} username 用户名
 * @param {string} password 密码
 * @param {string} email 邮箱（可选）
 * @param {string} phone 手机号（可选）
 * @param {string} nickname 昵称（可选）
 * @param {string} avatar 头像（可选）
 * @param {string} homepage 个人主页（可选）
 * @param {string} tags 标签（可选）
 * @Time O(1)
 * @Space O(1)
 */
exports.register = async (req, res) => {
  try {
    const { username, password, email, phone, nickname, avatar, homepage, tags } = req.body;
    // 防御性编程：参数校验
    if (!username || !password) return res.fail("用户名和密码必填");
    // 检查用户名是否已存在
    const exist = await User.findOne({ where: { username } });
    if (exist) return res.fail("用户名已存在");
    // 密码加密
    const hash = await bcrypt.hash(password, 10);
    // 创建用户
    const user = await User.create({
      username,
      password: hash,
      email,
      phone,
      nickname,
      avatar,
      homepage,
      tags,
    });
    res.success({ id: user.id, username: user.username }, "注册成功");
  } catch (err) {
    res.fail("注册失败");
  }
};

/**
 * 用户登录
 * @param {string} username 用户名
 * @param {string} password 密码
 * @Time O(1)
 * @Space O(1)
 */
exports.login = async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) return res.fail("用户名和密码必填");
    const user = await User.findOne({ where: { username } });
    if (!user) return res.fail("用户不存在");
    // 校验密码
    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.fail("密码错误");
    // 签发JWT
    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );
    res.success(
      {
        token,
        user: {
          id: user.id,
          username: user.username,
          nickname: user.nickname,
          avatar: user.avatar,
          role: user.role,
        },
      },
      "登录成功"
    );
  } catch (err) {
    res.fail("登录失败");
  }
};

/**
 * 用户查询
 * 支持按id、用户名、模糊搜索
 * @param {string} id 用户ID（可选）
 * @param {string} username 用户名（可选）
 * @param {string} keyword 关键字（可选，模糊搜索）
 * @Time O(n)
 * @Space O(n)
 */
exports.queryUser = async (req, res) => {
  try {
    const { id, username, keyword } = req.query;
    const where = {};
    if (id) where.id = id;
    if (username) where.username = username;
    if (keyword) {
      where.username = { $like: `%${keyword}%` };
    }
    // 查询用户
    const users = await User.findAll({ where, attributes: { exclude: ["password"] } });
    res.success(users, "查询成功");
  } catch (err) {
    res.fail("查询失败");
  }
};
