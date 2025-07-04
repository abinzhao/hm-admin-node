// middleware/errorHandler.js
// 全局错误处理中间件

function errorHandler(err, req, res, next) {
  console.error("全局错误：", err);
  res.json({
    code: err.code || 500,
    msg: err.message || "服务器内部错误",
    data: {},
  });
}

module.exports = { errorHandler };
