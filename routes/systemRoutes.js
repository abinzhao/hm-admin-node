const express = require('express');
const os = require('os');
const fs = require('fs');
const path = require('path');
const { db } = require('../config/database');
const { authMiddleware } = require('../middleware/auth');
const { successResponse, errorResponse } = require('../utils/response');
const tcpService = require('../service/tcpService');

const router = express.Router();

// 获取系统信息接口
router.get('/info', authMiddleware, (req, res) => {
  // 只有管理员可以查看系统信息
  if (req.user.role !== 'admin') {
    return res.json(errorResponse('无权限查看系统信息', 403));
  }

  try {
    // 获取数据库版本
    db.get("SELECT sqlite_version() as version", (err, dbResult) => {
      const sqliteVersion = dbResult ? dbResult.version : 'Unknown';

      // 获取数据库文件大小
      const dbPath = path.join(__dirname, '../HMOS-APP.db');
      let dbSize = 0;
      try {
        const stats = fs.statSync(dbPath);
        dbSize = Math.round(stats.size / 1024 / 1024 * 100) / 100; // MB
      } catch (e) {
        dbSize = 0;
      }

      // 获取日志文件大小
      const logDir = path.join(__dirname, '../logs');
      let logSize = 0;
      try {
        const files = fs.readdirSync(logDir);
        files.forEach(file => {
          const filePath = path.join(logDir, file);
          const stats = fs.statSync(filePath);
          logSize += stats.size;
        });
        logSize = Math.round(logSize / 1024 / 1024 * 100) / 100; // MB
      } catch (e) {
        logSize = 0;
      }

      // 获取资源文件大小
      const resourceDir = path.join(__dirname, '../resources');
      let resourceSize = 0;
      try {
        const getDirectorySize = (dirPath) => {
          let size = 0;
          const files = fs.readdirSync(dirPath);
          files.forEach(file => {
            const filePath = path.join(dirPath, file);
            const stats = fs.statSync(filePath);
            if (stats.isDirectory()) {
              size += getDirectorySize(filePath);
            } else {
              size += stats.size;
            }
          });
          return size;
        };
        resourceSize = Math.round(getDirectorySize(resourceDir) / 1024 / 1024 * 100) / 100; // MB
      } catch (e) {
        resourceSize = 0;
      }

      // 获取TCP服务状态
      const tcpStatus = tcpService.getStatus();

      // 获取系统运行时间
      const uptime = process.uptime();
      const uptimeFormatted = {
        days: Math.floor(uptime / 86400),
        hours: Math.floor((uptime % 86400) / 3600),
        minutes: Math.floor((uptime % 3600) / 60),
        seconds: Math.floor(uptime % 60)
      };

      // 获取内存使用情况
      const memUsage = process.memoryUsage();
      const formatBytes = (bytes) => Math.round(bytes / 1024 / 1024 * 100) / 100;

      // 获取CPU使用情况
      const cpuUsage = process.cpuUsage();

      // 系统信息
      const systemInfo = {
        // Node.js 信息
        node: {
          version: process.version,
          platform: process.platform,
          arch: process.arch,
          pid: process.pid,
          uptime: uptimeFormatted,
          uptimeSeconds: Math.floor(uptime)
        },

        // 数据库信息
        database: {
          type: 'SQLite',
          version: sqliteVersion,
          size: `${dbSize} MB`,
          path: dbPath
        },

        // 系统硬件信息
        system: {
          hostname: os.hostname(),
          platform: os.platform(),
          arch: os.arch(),
          release: os.release(),
          type: os.type(),
          cpus: os.cpus().length,
          totalMemory: `${Math.round(os.totalmem() / 1024 / 1024 / 1024 * 100) / 100} GB`,
          freeMemory: `${Math.round(os.freemem() / 1024 / 1024 / 1024 * 100) / 100} GB`,
          loadAverage: os.loadavg(),
          networkInterfaces: Object.keys(os.networkInterfaces())
        },

        // 进程内存使用
        memory: {
          rss: `${formatBytes(memUsage.rss)} MB`,
          heapTotal: `${formatBytes(memUsage.heapTotal)} MB`,
          heapUsed: `${formatBytes(memUsage.heapUsed)} MB`,
          external: `${formatBytes(memUsage.external)} MB`,
          arrayBuffers: `${formatBytes(memUsage.arrayBuffers)} MB`
        },

        // CPU使用情况
        cpu: {
          user: cpuUsage.user,
          system: cpuUsage.system,
          model: os.cpus()[0]?.model || 'Unknown',
          speed: `${os.cpus()[0]?.speed || 0} MHz`
        },

        // 服务状态
        services: {
          http: {
            status: 'running',
            port: 3000
          },
          tcp: {
            status: tcpStatus.isRunning ? 'running' : 'stopped',
            port: 3001,
            totalClients: tcpStatus.totalClients,
            activeClients: tcpStatus.activeClients.length
          }
        },

        // 存储信息
        storage: {
          database: `${dbSize} MB`,
          logs: `${logSize} MB`,
          resources: `${resourceSize} MB`,
          total: `${Math.round((dbSize + logSize + resourceSize) * 100) / 100} MB`
        },

        // 环境变量
        environment: {
          nodeEnv: process.env.NODE_ENV || 'development',
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          locale: Intl.DateTimeFormat().resolvedOptions().locale
        },

        // 版本信息
        versions: {
          node: process.versions.node,
          v8: process.versions.v8,
          uv: process.versions.uv,
          zlib: process.versions.zlib,
          openssl: process.versions.openssl,
          modules: process.versions.modules,
          npm: process.env.npm_version || 'Unknown'
        },

        // 启动时间
        startTime: new Date(Date.now() - uptime * 1000).toISOString(),
        currentTime: new Date().toISOString()
      };

      res.json(successResponse(systemInfo));
    });

  } catch (error) {
    res.json(errorResponse('获取系统信息失败'));
  }
});

// 获取系统健康状态
router.get('/health', authMiddleware, (req, res) => {
  if (req.user.role !== 'admin') {
    return res.json(errorResponse('无权限查看系统健康状态', 403));
  }

  try {
    const memUsage = process.memoryUsage();
    const cpuUsage = process.cpuUsage();
    const uptime = process.uptime();
    const tcpStatus = tcpService.getStatus();

    // 健康检查指标
    const healthMetrics = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: Math.floor(uptime),
      
      // 内存健康状态
      memory: {
        heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024),
        heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024),
        usage: Math.round((memUsage.heapUsed / memUsage.heapTotal) * 100),
        status: memUsage.heapUsed / memUsage.heapTotal < 0.9 ? 'healthy' : 'warning'
      },

      // 服务状态
      services: {
        http: { status: 'running', healthy: true },
        tcp: { 
          status: tcpStatus.isRunning ? 'running' : 'stopped',
          healthy: tcpStatus.isRunning,
          clients: tcpStatus.totalClients
        },
        database: { status: 'connected', healthy: true }
      },

      // 系统负载
      load: {
        average: os.loadavg(),
        cpuCount: os.cpus().length
      }
    };

    // 判断整体健康状态
    const isHealthy = 
      healthMetrics.memory.status === 'healthy' &&
      healthMetrics.services.http.healthy &&
      healthMetrics.services.database.healthy;

    healthMetrics.status = isHealthy ? 'healthy' : 'warning';

    res.json(successResponse(healthMetrics));

  } catch (error) {
    res.json(successResponse({
      status: 'error',
      timestamp: new Date().toISOString(),
      error: error.message
    }));
  }
});

// 获取系统性能指标
router.get('/metrics', authMiddleware, (req, res) => {
  if (req.user.role !== 'admin') {
    return res.json(errorResponse('无权限查看系统指标', 403));
  }

  // 获取数据库统计
  Promise.all([
    new Promise((resolve) => {
      db.get("SELECT COUNT(*) as count FROM users", (err, result) => {
        resolve(err ? 0 : result.count);
      });
    }),
    new Promise((resolve) => {
      db.get("SELECT COUNT(*) as count FROM contents", (err, result) => {
        resolve(err ? 0 : result.count);
      });
    }),
    new Promise((resolve) => {
      db.get("SELECT COUNT(*) as count FROM apps", (err, result) => {
        resolve(err ? 0 : result.count);
      });
    }),
    new Promise((resolve) => {
      db.get("SELECT COUNT(*) as count FROM logs", (err, result) => {
        resolve(err ? 0 : result.count);
      });
    })
  ]).then(([userCount, contentCount, appCount, logCount]) => {
    const metrics = {
      timestamp: new Date().toISOString(),
      
      // 数据库指标
      database: {
        users: userCount,
        contents: contentCount,
        apps: appCount,
        logs: logCount,
        total: userCount + contentCount + appCount + logCount
      },

      // 系统指标
      system: {
        uptime: Math.floor(process.uptime()),
        memoryUsage: process.memoryUsage(),
        cpuUsage: process.cpuUsage(),
        platform: process.platform,
        nodeVersion: process.version
      },

      // TCP服务指标
      tcp: tcpService.getStatus(),

      // 性能指标
      performance: {
        eventLoopDelay: process.hrtime(),
        gcStats: process.memoryUsage()
      }
    };

    res.json(successResponse(metrics));
  }).catch(error => {
    res.json(errorResponse('获取系统指标失败'));
  });
});

module.exports = router;
