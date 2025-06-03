// 统一响应格式
function successResponse(data = null, message = '操作成功') {
  return {
    status: 200,
    message,
    data
  };
}

function errorResponse(message = '操作失败', status = 400) {
  return {
    status,
    message,
    data: null
  };
}

module.exports = { successResponse, errorResponse };
