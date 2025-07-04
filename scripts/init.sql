-- 数据库初始化脚本
-- 创建用户表
CREATE TABLE IF NOT EXISTS `user` (
  `id` BIGINT PRIMARY KEY AUTO_INCREMENT,
  `username` VARCHAR(50) NOT NULL UNIQUE,
  `password` VARCHAR(255) NOT NULL,
  `email` VARCHAR(100) UNIQUE,
  `phone` VARCHAR(20) UNIQUE,
  `nickname` VARCHAR(50),
  `avatar` VARCHAR(255),
  `bio` VARCHAR(255),
  `homepage` VARCHAR(255),
  `tags` VARCHAR(255),
  `role` TINYINT DEFAULT 0,
  `status` TINYINT DEFAULT 0,
  `huawei_unionid` VARCHAR(100),
  `huawei_openid` VARCHAR(100),
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 内容表
CREATE TABLE IF NOT EXISTS `content` (
  `id` BIGINT PRIMARY KEY AUTO_INCREMENT,
  `user_id` BIGINT NOT NULL,
  `type` ENUM('article','qa','code') NOT NULL,
  `title` VARCHAR(200) NOT NULL,
  `summary` VARCHAR(500),
  `content` TEXT NOT NULL,
  `tags` VARCHAR(255),
  `category` VARCHAR(50),
  `main_image` VARCHAR(255),
  `language` VARCHAR(50),
  `like_count` INT DEFAULT 0,
  `collect_count` INT DEFAULT 0,
  `status` TINYINT DEFAULT 0,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 软件表
CREATE TABLE IF NOT EXISTS `software` (
  `id` BIGINT PRIMARY KEY AUTO_INCREMENT,
  `user_id` BIGINT NOT NULL,
  `name` VARCHAR(100) NOT NULL,
  `package_name` VARCHAR(100) NOT NULL UNIQUE,
  `icon` VARCHAR(255),
  `description` VARCHAR(500),
  `update_info` VARCHAR(500),
  `version` VARCHAR(50),
  `download_url` VARCHAR(255),
  `download_count` INT DEFAULT 0,
  `tags` VARCHAR(255),
  `status` TINYINT DEFAULT 0,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 评论表
CREATE TABLE IF NOT EXISTS `comment` (
  `id` BIGINT PRIMARY KEY AUTO_INCREMENT,
  `content_id` BIGINT NOT NULL,
  `user_id` BIGINT NOT NULL,
  `content` VARCHAR(500) NOT NULL,
  `status` TINYINT DEFAULT 0,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 通知表
CREATE TABLE IF NOT EXISTS `notification` (
  `id` BIGINT PRIMARY KEY AUTO_INCREMENT,
  `user_id` BIGINT,
  `type` ENUM('system','comment','reply') NOT NULL,
  `content` VARCHAR(255) NOT NULL,
  `is_read` TINYINT DEFAULT 0,
  `status` TINYINT DEFAULT 0,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 代办事项表
CREATE TABLE IF NOT EXISTS `todo` (
  `id` BIGINT PRIMARY KEY AUTO_INCREMENT,
  `user_id` BIGINT NOT NULL,
  `title` VARCHAR(100) NOT NULL,
  `description` VARCHAR(255),
  `status` ENUM('not_started','in_progress','completed') DEFAULT 'not_started',
  `priority` ENUM('low','medium','high','urgent') DEFAULT 'medium',
  `deadline` DATETIME,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 点赞表
CREATE TABLE IF NOT EXISTS `content_like` (
  `id` BIGINT PRIMARY KEY AUTO_INCREMENT,
  `user_id` BIGINT NOT NULL,
  `content_id` BIGINT NOT NULL,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY `uniq_user_content` (`user_id`, `content_id`)
);

-- 收藏表
CREATE TABLE IF NOT EXISTS `content_collect` (
  `id` BIGINT PRIMARY KEY AUTO_INCREMENT,
  `user_id` BIGINT NOT NULL,
  `content_id` BIGINT NOT NULL,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY `uniq_user_content` (`user_id`, `content_id`)
);

-- 操作日志表
CREATE TABLE IF NOT EXISTS `operation_log` (
  `id` BIGINT PRIMARY KEY AUTO_INCREMENT,
  `user_id` BIGINT,
  `action` VARCHAR(50) NOT NULL,
  `target_type` VARCHAR(50) NOT NULL,
  `target_id` BIGINT NOT NULL,
  `detail` TEXT,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP
); 