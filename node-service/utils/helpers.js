const crypto = require('crypto');
const path = require('path');
const moment = require('moment');

// 生成随机字符串
const generateRandomString = (length = 16) => {
  return crypto.randomBytes(length).toString('hex');
};

// 生成UUID
const generateUUID = () => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};

// MD5哈希
const md5 = (str) => {
  return crypto.createHash('md5').update(str).digest('hex');
};

// SHA256哈希
const sha256 = (str) => {
  return crypto.createHash('sha256').update(str).digest('hex');
};

// 格式化文件大小
const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

// 获取文件扩展名
const getFileExtension = (filename) => {
  return path.extname(filename).toLowerCase();
};

// 获取安全的文件名
const getSafeFilename = (filename) => {
  // 移除特殊字符，保留中文、英文、数字、点、下划线、连字符
  return filename.replace(/[^\u4e00-\u9fa5\w\.\-]/g, '_');
};

// 生成唯一文件名
const generateUniqueFilename = (originalName) => {
  const ext = getFileExtension(originalName);
  const basename = path.basename(originalName, ext);
  const safeBasename = getSafeFilename(basename);
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  
  return `${safeBasename}_${timestamp}_${random}${ext}`;
};

// 分页参数处理
const parsePagination = (query) => {
  const page = parseInt(query.page) || 1;
  const limit = Math.min(parseInt(query.limit) || 20, 100); // 最大100条
  const offset = (page - 1) * limit;
  
  return { page, limit, offset };
};

// 构建分页响应
const buildPaginationResponse = (data, total, page, limit) => {
  const totalPages = Math.ceil(total / limit);
  
  return {
    data,
    pagination: {
      current: page,
      total: totalPages,
      size: limit,
      count: total,
      hasNext: page < totalPages,
      hasPrev: page > 1
    }
  };
};

// 排序参数处理
const parseSort = (sortParam, allowedFields = []) => {
  if (!sortParam) return {};
  
  const sorts = sortParam.split(',').map(field => {
    const order = field.startsWith('-') ? 'DESC' : 'ASC';
    const column = field.replace(/^-/, '');
    
    // 检查字段是否被允许
    if (allowedFields.length > 0 && !allowedFields.includes(column)) {
      return null;
    }
    
    return [column, order];
  }).filter(Boolean);
  
  return sorts.length > 0 ? sorts : {};
};

// 过滤参数处理
const parseFilters = (query, allowedFilters = []) => {
  const filters = {};
  
  for (const key in query) {
    if (allowedFilters.includes(key) && query[key] !== undefined && query[key] !== '') {
      // 处理数组参数
      if (query[key].includes(',')) {
        filters[key] = query[key].split(',');
      } else {
        filters[key] = query[key];
      }
    }
  }
  
  return filters;
};

// 日期范围处理
const parseDateRange = (dateRangeStr) => {
  if (!dateRangeStr) return {};
  
  const dates = dateRangeStr.split(',');
  if (dates.length !== 2) return {};
  
  const startDate = moment(dates[0]).startOf('day');
  const endDate = moment(dates[1]).endOf('day');
  
  if (!startDate.isValid() || !endDate.isValid()) return {};
  
  return {
    startDate: startDate.toDate(),
    endDate: endDate.toDate()
  };
};

// 验证邮箱格式
const isValidEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

// 验证手机号格式（中国）
const isValidPhone = (phone) => {
  const phoneRegex = /^1[3-9]\d{9}$/;
  return phoneRegex.test(phone);
};

// 验证密码强度
const validatePassword = (password) => {
  if (password.length < 6) {
    return { valid: false, message: '密码长度至少6位' };
  }
  
  if (password.length > 20) {
    return { valid: false, message: '密码长度不能超过20位' };
  }
  
  // 至少包含数字和字母
  const hasNumber = /\d/.test(password);
  const hasLetter = /[a-zA-Z]/.test(password);
  
  if (!hasNumber || !hasLetter) {
    return { valid: false, message: '密码必须包含数字和字母' };
  }
  
  return { valid: true, message: '密码强度合格' };
};

// 生成验证码
const generateVerificationCode = (length = 6) => {
  const chars = '0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

// 掩码处理（隐藏敏感信息）
const maskEmail = (email) => {
  if (!email) return '';
  const [username, domain] = email.split('@');
  const maskedUsername = username.length > 2 ? 
    username.substring(0, 2) + '*'.repeat(username.length - 2) : 
    username;
  return `${maskedUsername}@${domain}`;
};

const maskPhone = (phone) => {
  if (!phone) return '';
  return phone.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2');
};

// 时间格式化
const formatDateTime = (date, format = 'YYYY-MM-DD HH:mm:ss') => {
  return moment(date).format(format);
};

// 相对时间
const timeAgo = (date) => {
  return moment(date).fromNow();
};

// 深度克隆对象
const deepClone = (obj) => {
  if (obj === null || typeof obj !== 'object') return obj;
  if (obj instanceof Date) return new Date(obj.getTime());
  if (obj instanceof Array) return obj.map(item => deepClone(item));
  if (typeof obj === 'object') {
    const clonedObj = {};
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        clonedObj[key] = deepClone(obj[key]);
      }
    }
    return clonedObj;
  }
};

// 对象属性过滤
const pick = (obj, keys) => {
  const result = {};
  keys.forEach(key => {
    if (key in obj) {
      result[key] = obj[key];
    }
  });
  return result;
};

// 移除对象中的空值
const removeEmpty = (obj) => {
  const result = {};
  for (const key in obj) {
    if (obj[key] !== null && obj[key] !== undefined && obj[key] !== '') {
      result[key] = obj[key];
    }
  }
  return result;
};

// 防抖函数
const debounce = (func, wait) => {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
};

// 节流函数
const throttle = (func, limit) => {
  let inThrottle;
  return function executedFunction(...args) {
    if (!inThrottle) {
      func.apply(this, args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
};

// 重试函数
const retry = async (fn, maxRetries = 3, delay = 1000) => {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      await new Promise(resolve => setTimeout(resolve, delay * Math.pow(2, i)));
    }
  }
};

// 异步并发控制
const promiseLimit = async (promises, limit = 5) => {
  const results = [];
  const executing = [];
  
  for (let i = 0; i < promises.length; i++) {
    const promise = promises[i]();
    results.push(promise);
    
    if (promises.length >= limit) {
      const executing_promise = promise.then(() => {
        executing.splice(executing.indexOf(executing_promise), 1);
      });
      executing.push(executing_promise);
      
      if (executing.length >= limit) {
        await Promise.race(executing);
      }
    }
  }
  
  return Promise.all(results);
};

// 缓存包装器
const cache = (fn, ttl = 60000) => {
  const cache = new Map();
  
  return async (...args) => {
    const key = JSON.stringify(args);
    const cached = cache.get(key);
    
    if (cached && Date.now() - cached.timestamp < ttl) {
      return cached.value;
    }
    
    const result = await fn(...args);
    cache.set(key, { value: result, timestamp: Date.now() });
    
    return result;
  };
};

module.exports = {
  generateRandomString,
  generateUUID,
  md5,
  sha256,
  formatFileSize,
  getFileExtension,
  getSafeFilename,
  generateUniqueFilename,
  parsePagination,
  buildPaginationResponse,
  parseSort,
  parseFilters,
  parseDateRange,
  isValidEmail,
  isValidPhone,
  validatePassword,
  generateVerificationCode,
  maskEmail,
  maskPhone,
  formatDateTime,
  timeAgo,
  deepClone,
  pick,
  removeEmpty,
  debounce,
  throttle,
  retry,
  promiseLimit,
  cache
}; 