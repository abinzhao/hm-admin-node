const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

/**
 * 数据库初始化脚本
 * 创建数据库、表结构和基础数据
 */

const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '123456',
  charset: 'utf8mb4'
};

const databaseName = process.env.DB_NAME || 'hm_community';

async function initializeDatabase() {
  let connection;
  
  try {
    console.log('🚀 开始初始化数据库...');
    
    // 创建数据库连接（不指定数据库）
    connection = await mysql.createConnection(dbConfig);
    console.log('✅ 数据库连接成功');
    
    // 创建数据库
    await connection.execute(`CREATE DATABASE IF NOT EXISTS \`${databaseName}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
    console.log(`✅ 数据库 ${databaseName} 创建成功`);
    
    // 选择数据库
    await connection.execute(`USE \`${databaseName}\``);
    
    // 使用Sequelize同步表结构
    console.log('📦 开始同步数据模型...');
    const { sequelize } = require('../models');
    
    // 强制同步表结构（开发环境）
    await sequelize.sync({ force: false, alter: true });
    console.log('✅ 数据模型同步完成');
    
    // 创建基础数据
    await createBaseData();
    
    console.log('🎉 数据库初始化完成！');
    
  } catch (error) {
    console.error('❌ 数据库初始化失败:', error.message);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
    }
    process.exit(0);
  }
}

/**
 * 创建基础数据
 */
async function createBaseData() {
  const { User, Category, Tag } = require('../models');
  
  try {
    console.log('📝 创建基础数据...');
    
    // 创建默认管理员用户
    const adminExists = await User.findOne({ where: { email: 'admin@hm.com' } });
    if (!adminExists) {
      await User.create({
        username: 'admin',
        email: 'admin@hm.com',
        password: '123456', // 会被自动加密
        nickname: '系统管理员',
        role: 'admin',
        status: 'active',
        isEmailVerified: true,
        profile: {
          bio: '系统管理员账户',
          location: '中国'
        }
      });
      console.log('✅ 默认管理员用户创建成功');
    }
    
    // 创建默认分类
    const categories = [
      { name: '前端开发', slug: 'frontend', description: '前端技术相关内容', icon: '🎨' },
      { name: '后端开发', slug: 'backend', description: '后端技术相关内容', icon: '⚙️' },
      { name: '移动开发', slug: 'mobile', description: '移动端开发相关内容', icon: '📱' },
      { name: '人工智能', slug: 'ai', description: 'AI和机器学习相关内容', icon: '🤖' },
      { name: '数据库', slug: 'database', description: '数据库相关内容', icon: '🗄️' },
      { name: '运维部署', slug: 'devops', description: '运维和部署相关内容', icon: '🚀' },
      { name: '求职面试', slug: 'interview', description: '求职和面试相关内容', icon: '💼' },
      { name: '工具资源', slug: 'tools', description: '开发工具和资源分享', icon: '🔧' }
    ];
    
    for (const categoryData of categories) {
      const exists = await Category.findOne({ where: { slug: categoryData.slug } });
      if (!exists) {
        await Category.create(categoryData);
      }
    }
    console.log('✅ 默认分类创建成功');
    
    // 创建默认标签
    const tags = [
      'JavaScript', 'TypeScript', 'React', 'Vue', 'Node.js', 
      'Python', 'Java', 'Go', 'Rust', 'PHP',
      'MySQL', 'MongoDB', 'Redis', 'PostgreSQL',
      'Docker', 'Kubernetes', 'AWS', 'nginx',
      'HTML', 'CSS', 'Webpack', 'Vite', 'Next.js',
      '算法', '数据结构', '系统设计', '性能优化'
    ];
    
    for (const tagName of tags) {
      const exists = await Tag.findOne({ where: { name: tagName } });
      if (!exists) {
        await Tag.create({
          name: tagName,
          slug: tagName.toLowerCase().replace(/[^a-z0-9]/g, '-')
        });
      }
    }
    console.log('✅ 默认标签创建成功');
    
    console.log('✅ 基础数据创建完成');
    
  } catch (error) {
    console.error('❌ 基础数据创建失败:', error.message);
    throw error;
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  initializeDatabase();
}

module.exports = { initializeDatabase }; 