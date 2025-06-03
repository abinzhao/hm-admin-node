const express = require('express');
const { db } = require('../config/database');
const { authMiddleware } = require('../middleware/auth');
const { successResponse, errorResponse } = require('../utils/response');

const router = express.Router();

// 首页数据查询接口
router.get('/stats', authMiddleware, (req, res) => {
  const userId = req.user.id;
  const isAdmin = req.user.role === 'admin';

  if (isAdmin) {
    // 管理员查看所有数据
    Promise.all([
      // 文章总数
      new Promise((resolve, reject) => {
        db.get("SELECT COUNT(*) as count FROM contents WHERE contentType = '文章'", (err, result) => {
          if (err) reject(err);
          else resolve(result.count);
        });
      }),
      // 问答总数
      new Promise((resolve, reject) => {
        db.get("SELECT COUNT(*) as count FROM contents WHERE contentType = '问答'", (err, result) => {
          if (err) reject(err);
          else resolve(result.count);
        });
      }),
      // 代码片段总数
      new Promise((resolve, reject) => {
        db.get("SELECT COUNT(*) as count FROM contents WHERE contentType = '代码片段'", (err, result) => {
          if (err) reject(err);
          else resolve(result.count);
        });
      }),
      // 应用总数
      new Promise((resolve, reject) => {
        db.get("SELECT COUNT(*) as count FROM apps", (err, result) => {
          if (err) reject(err);
          else resolve(result.count);
        });
      }),
      // 用户总数
      new Promise((resolve, reject) => {
        db.get("SELECT COUNT(*) as count FROM users", (err, result) => {
          if (err) reject(err);
          else resolve(result.count);
        });
      }),
      // 留言总数
      new Promise((resolve, reject) => {
        db.get("SELECT COUNT(*) as count FROM messages", (err, result) => {
          if (err) reject(err);
          else resolve(result.count);
        });
      }),
      // 通知总数
      new Promise((resolve, reject) => {
        db.get("SELECT COUNT(*) as count FROM notifications", (err, result) => {
          if (err) reject(err);
          else resolve(result.count);
        });
      }),
      // 代办事项总数
      new Promise((resolve, reject) => {
        db.get("SELECT COUNT(*) as count FROM todos", (err, result) => {
          if (err) reject(err);
          else resolve(result.count);
        });
      }),
      // 今日新增用户
      new Promise((resolve, reject) => {
        db.get("SELECT COUNT(*) as count FROM users WHERE DATE(createTime) = DATE('now')", (err, result) => {
          if (err) reject(err);
          else resolve(result.count);
        });
      }),
      // 今日新增内容
      new Promise((resolve, reject) => {
        db.get("SELECT COUNT(*) as count FROM contents WHERE DATE(createTime) = DATE('now')", (err, result) => {
          if (err) reject(err);
          else resolve(result.count);
        });
      }),
      // 今日新增应用
      new Promise((resolve, reject) => {
        db.get("SELECT COUNT(*) as count FROM apps WHERE DATE(createTime) = DATE('now')", (err, result) => {
          if (err) reject(err);
          else resolve(result.count);
        });
      })
    ]).then(([
      articleCount, 
      qaCount, 
      codeCount, 
      appCount, 
      userCount, 
      messageCount, 
      notificationCount, 
      todoCount,
      todayUserCount,
      todayContentCount,
      todayAppCount
    ]) => {
      res.json(successResponse({
        role: 'admin',
        totalStats: {
          articles: articleCount,
          qa: qaCount,
          codeSnippets: codeCount,
          apps: appCount,
          users: userCount,
          messages: messageCount,
          notifications: notificationCount,
          todos: todoCount
        },
        todayStats: {
          newUsers: todayUserCount,
          newContents: todayContentCount,
          newApps: todayAppCount
        },
        contentStats: {
          total: articleCount + qaCount + codeCount,
          articles: articleCount,
          qa: qaCount,
          codeSnippets: codeCount
        }
      }));
    }).catch(err => {
      res.json(errorResponse('获取统计数据失败'));
    });

  } else {
    // 普通用户查看自己的数据
    Promise.all([
      // 用户的文章总数
      new Promise((resolve, reject) => {
        db.get("SELECT COUNT(*) as count FROM contents WHERE userId = ? AND contentType = '文章'", [userId], (err, result) => {
          if (err) reject(err);
          else resolve(result.count);
        });
      }),
      // 用户的问答总数
      new Promise((resolve, reject) => {
        db.get("SELECT COUNT(*) as count FROM contents WHERE userId = ? AND contentType = '问答'", [userId], (err, result) => {
          if (err) reject(err);
          else resolve(result.count);
        });
      }),
      // 用户的代码片段总数
      new Promise((resolve, reject) => {
        db.get("SELECT COUNT(*) as count FROM contents WHERE userId = ? AND contentType = '代码片段'", [userId], (err, result) => {
          if (err) reject(err);
          else resolve(result.count);
        });
      }),
      // 用户的应用总数
      new Promise((resolve, reject) => {
        db.get("SELECT COUNT(*) as count FROM apps WHERE userId = ?", [userId], (err, result) => {
          if (err) reject(err);
          else resolve(result.count);
        });
      }),
      // 用户的代办事项总数
      new Promise((resolve, reject) => {
        db.get("SELECT COUNT(*) as count FROM todos WHERE userId = ?", [userId], (err, result) => {
          if (err) reject(err);
          else resolve(result.count);
        });
      }),
      // 用户的待完成代办事项
      new Promise((resolve, reject) => {
        db.get("SELECT COUNT(*) as count FROM todos WHERE userId = ? AND status = 'pending'", [userId], (err, result) => {
          if (err) reject(err);
          else resolve(result.count);
        });
      }),
      // 用户收到的留言总数
      new Promise((resolve, reject) => {
        db.get(`SELECT COUNT(*) as count FROM messages m 
                 WHERE m.targetId IN (
                   SELECT id FROM contents WHERE userId = ?
                   UNION
                   SELECT id FROM apps WHERE userId = ?
                 )`, [userId, userId], (err, result) => {
          if (err) reject(err);
          else resolve(result.count);
        });
      })
    ]).then(([
      articleCount, 
      qaCount, 
      codeCount, 
      appCount, 
      todoCount,
      pendingTodoCount,
      messageCount
    ]) => {
      res.json(successResponse({
        role: 'user',
        myStats: {
          articles: articleCount,
          qa: qaCount,
          codeSnippets: codeCount,
          apps: appCount,
          todos: todoCount,
          pendingTodos: pendingTodoCount,
          receivedMessages: messageCount
        },
        contentStats: {
          total: articleCount + qaCount + codeCount,
          articles: articleCount,
          qa: qaCount,
          codeSnippets: codeCount
        }
      }));
    }).catch(err => {
      res.json(errorResponse('获取统计数据失败'));
    });
  }
});

// 获取最近活动数据
router.get('/recent-activities', authMiddleware, (req, res) => {
  const userId = req.user.id;
  const isAdmin = req.user.role === 'admin';
  const limit = parseInt(req.query.limit) || 10;

  if (isAdmin) {
    // 管理员查看系统最近活动
    Promise.all([
      // 最近内容
      new Promise((resolve, reject) => {
        db.all(`SELECT c.*, u.username, u.nickname 
                FROM contents c 
                LEFT JOIN users u ON c.userId = u.id 
                ORDER BY c.createTime DESC 
                LIMIT ?`, [limit], (err, results) => {
          if (err) reject(err);
          else resolve(results);
        });
      }),
      // 最近应用
      new Promise((resolve, reject) => {
        db.all(`SELECT a.*, u.username, u.nickname 
                FROM apps a 
                LEFT JOIN users u ON a.userId = u.id 
                ORDER BY a.createTime DESC 
                LIMIT ?`, [limit], (err, results) => {
          if (err) reject(err);
          else resolve(results);
        });
      }),
      // 最近用户
      new Promise((resolve, reject) => {
        db.all(`SELECT id, userId, username, nickname, createTime 
                FROM users 
                ORDER BY createTime DESC 
                LIMIT ?`, [limit], (err, results) => {
          if (err) reject(err);
          else resolve(results);
        });
      })
    ]).then(([recentContents, recentApps, recentUsers]) => {
      res.json(successResponse({
        recentContents,
        recentApps,
        recentUsers
      }));
    }).catch(err => {
      res.json(errorResponse('获取最近活动失败'));
    });

  } else {
    // 普通用户查看自己的最近活动
    Promise.all([
      // 用户最近内容
      new Promise((resolve, reject) => {
        db.all(`SELECT * FROM contents 
                WHERE userId = ? 
                ORDER BY createTime DESC 
                LIMIT ?`, [userId, limit], (err, results) => {
          if (err) reject(err);
          else resolve(results);
        });
      }),
      // 用户最近应用
      new Promise((resolve, reject) => {
        db.all(`SELECT * FROM apps 
                WHERE userId = ? 
                ORDER BY createTime DESC 
                LIMIT ?`, [userId, limit], (err, results) => {
          if (err) reject(err);
          else resolve(results);
        });
      }),
      // 用户最近代办事项
      new Promise((resolve, reject) => {
        db.all(`SELECT * FROM todos 
                WHERE userId = ? 
                ORDER BY createTime DESC 
                LIMIT ?`, [userId, limit], (err, results) => {
          if (err) reject(err);
          else resolve(results);
        });
      })
    ]).then(([myRecentContents, myRecentApps, myRecentTodos]) => {
      res.json(successResponse({
        myRecentContents,
        myRecentApps,
        myRecentTodos
      }));
    }).catch(err => {
      res.json(errorResponse('获取最近活动失败'));
    });
  }
});

module.exports = router;
