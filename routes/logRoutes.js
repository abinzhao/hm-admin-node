const express = require('express');
const moment = require('moment');
const { db } = require('../config/database');
const { authMiddleware } = require('../middleware/auth');
const { successResponse, errorResponse } = require('../utils/response');
const tcpService = require('../service/tcpService');

const router = express.Router();

// 查询日志（分页，多维度查询）
router.get('/', authMiddleware, (req, res) => {
  // 只有管理员可以查看日志
  if (req.user.role !== 'admin') {
    return res.json(errorResponse('无权限查看日志', 403));
  }

  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;
  const offset = (page - 1) * limit;
  
  // 查询条件
  const level = req.query.level; // 日志级别：error, warn, info, debug
  const source = req.query.source; // 日志来源：tcp, api, database, system
  const startDate = req.query.startDate; // 开始时间
  const endDate = req.query.endDate; // 结束时间
  const keyword = req.query.keyword; // 关键词搜索

  let whereConditions = [];
  let params = [];

  // 构建查询条件
  if (level) {
    whereConditions.push('level = ?');
    params.push(level);
  }

  if (source) {
    whereConditions.push('source = ?');
    params.push(source);
  }

  if (startDate) {
    whereConditions.push('timestamp >= ?');
    params.push(moment(startDate).format('YYYY-MM-DD HH:mm:ss'));
  }

  if (endDate) {
    whereConditions.push('timestamp <= ?');
    params.push(moment(endDate).format('YYYY-MM-DD HH:mm:ss'));
  }

  if (keyword) {
    whereConditions.push('(message LIKE ? OR meta LIKE ?)');
    params.push(`%${keyword}%`, `%${keyword}%`);
  }

  const whereClause = whereConditions.length > 0 ? 'WHERE ' + whereConditions.join(' AND ') : '';

  // 获取总数
  db.get(
    `SELECT COUNT(*) as total FROM logs ${whereClause}`,
    params,
    (err, countResult) => {
      if (err) {
        return res.json(errorResponse('查询日志总数失败'));
      }

      // 获取分页数据
      const queryParams = [...params, limit, offset];
      db.all(
        `SELECT * FROM logs ${whereClause} ORDER BY timestamp DESC LIMIT ? OFFSET ?`,
        queryParams,
        (err, logs) => {
          if (err) {
            return res.json(errorResponse('查询日志失败'));
          }

          // 解析meta字段
          const logList = logs.map(log => {
            try {
              log.meta = log.meta ? JSON.parse(log.meta) : {};
            } catch (e) {
              log.meta = {};
            }
            return log;
          });

          res.json(successResponse({
            list: logList,
            total: countResult.total,
            page,
            limit,
            filters: {
              level,
              source,
              startDate,
              endDate,
              keyword
            }
          }));
        }
      );
    }
  );
});

// 获取日志统计信息
router.get('/stats', authMiddleware, (req, res) => {
  if (req.user.role !== 'admin') {
    return res.json(errorResponse('无权限查看日志统计', 403));
  }

  const timeRange = req.query.timeRange || '24h'; // 24h, 7d, 30d
  let timeCondition = '';
  
  switch (timeRange) {
    case '24h':
      timeCondition = "timestamp >= datetime('now', '-1 day')";
      break;
    case '7d':
      timeCondition = "timestamp >= datetime('now', '-7 days')";
      break;
    case '30d':
      timeCondition = "timestamp >= datetime('now', '-30 days')";
      break;
    default:
      timeCondition = "timestamp >= datetime('now', '-1 day')";
  }

  // 获取各级别日志统计
  db.all(
    `SELECT level, COUNT(*) as count FROM logs WHERE ${timeCondition} GROUP BY level`,
    (err, levelStats) => {
      if (err) {
        return res.json(errorResponse('获取日志级别统计失败'));
      }

      // 获取各来源日志统计
      db.all(
        `SELECT source, COUNT(*) as count FROM logs WHERE ${timeCondition} GROUP BY source`,
        (err, sourceStats) => {
          if (err) {
            return res.json(errorResponse('获取日志来源统计失败'));
          }

          // 获取总数
          db.get(
            `SELECT COUNT(*) as total FROM logs WHERE ${timeCondition}`,
            (err, totalResult) => {
              if (err) {
                return res.json(errorResponse('获取日志总数失败'));
              }

              res.json(successResponse({
                timeRange,
                total: totalResult.total,
                levelStats,
                sourceStats
              }));
            }
          );
        }
      );
    }
  );
});

// 删除日志
router.delete('/', authMiddleware, (req, res) => {
  if (req.user.role !== 'admin') {
    return res.json(errorResponse('无权限删除日志', 403));
  }

  const { ids, beforeDate, level, source } = req.body;

  let deleteConditions = [];
  let params = [];

  if (ids && Array.isArray(ids) && ids.length > 0) {
    // 删除指定ID的日志
    const placeholders = ids.map(() => '?').join(',');
    deleteConditions.push(`id IN (${placeholders})`);
    params.push(...ids);
  } else {
    // 根据条件批量删除
    if (beforeDate) {
      deleteConditions.push('timestamp < ?');
      params.push(moment(beforeDate).format('YYYY-MM-DD HH:mm:ss'));
    }

    if (level) {
      deleteConditions.push('level = ?');
      params.push(level);
    }

    if (source) {
      deleteConditions.push('source = ?');
      params.push(source);
    }
  }

  if (deleteConditions.length === 0) {
    return res.json(errorResponse('请提供删除条件'));
  }

  const whereClause = 'WHERE ' + deleteConditions.join(' AND ');

  db.run(
    `DELETE FROM logs ${whereClause}`,
    params,
    function(err) {
      if (err) {
        return res.json(errorResponse('删除日志失败'));
      }

      res.json(successResponse({
        deletedCount: this.changes
      }, `成功删除 ${this.changes} 条日志`));
    }
  );
});

// 清空所有日志
router.delete('/clear', authMiddleware, (req, res) => {
  if (req.user.role !== 'admin') {
    return res.json(errorResponse('无权限清空日志', 403));
  }

  db.run('DELETE FROM logs', function(err) {
    if (err) {
      return res.json(errorResponse('清空日志失败'));
    }

    res.json(successResponse({
      deletedCount: this.changes
    }, `成功清空 ${this.changes} 条日志`));
  });
});

// 获取TCP服务状态
router.get('/tcp-status', authMiddleware, (req, res) => {
  if (req.user.role !== 'admin') {
    return res.json(errorResponse('无权限查看TCP状态', 403));
  }

  const status = tcpService.getStatus();
  res.json(successResponse(status));
});

// TCP服务广播消息
router.post('/tcp-broadcast', authMiddleware, (req, res) => {
  if (req.user.role !== 'admin') {
    return res.json(errorResponse('无权限发送广播消息', 403));
  }

  const { message } = req.body;
  if (!message) {
    return res.json(errorResponse('广播消息不能为空'));
  }

  const sentCount = tcpService.broadcast(message);
  res.json(successResponse({
    sentCount,
    message
  }, `广播消息已发送给 ${sentCount} 个客户端`));
});

module.exports = router;
