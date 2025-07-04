// utils/response.js
// 统一响应工具

/**
 * 统一响应中间件，挂载 res.success 和 res.fail
 */
function responseHandler(req, res, next) {
  res.success = function (data = {}, msg = "操作成功", code = 0) {
    res.json({ code, msg, data });
  };
  res.fail = function (msg = "操作失败", code = 1, data = {}) {
    res.json({ code, msg, data });
  };
  next();
}

module.exports = { responseHandler };
