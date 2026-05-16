-- =============================================
-- 盘搜按次付费系统 · MySQL 数据库初始化脚本
-- 单价：2元 = 200分
-- =============================================

CREATE DATABASE IF NOT EXISTS `pansou_pay` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE `pansou_pay`;

-- 资源结果表（索引用的资源表，不存文件本体）
CREATE TABLE IF NOT EXISTS `results` (
  `id` BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  `title` VARCHAR(255) NOT NULL COMMENT '资源标题',
  `pan_type` VARCHAR(32) NOT NULL COMMENT '网盘类型：百度网盘/阿里云盘/夸克网盘/115网盘 等',
  `share_url` VARCHAR(512) NOT NULL COMMENT '分享链接',
  `extract_code` VARCHAR(32) DEFAULT NULL COMMENT '提取码（可能为空）',
  `size` VARCHAR(32) DEFAULT NULL COMMENT '文件大小描述',
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_title` (`title`(100)),
  INDEX `idx_pan_type` (`pan_type`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='资源结果表';

-- 支付订单表
CREATE TABLE IF NOT EXISTS `pay_orders` (
  `order_no` VARCHAR(64) PRIMARY KEY COMMENT '订单号（唯一）',
  `client_id` VARCHAR(64) NOT NULL COMMENT '浏览器匿名ID（对应 localStorage.pansou_client_id）',
  `result_id` BIGINT UNSIGNED NOT NULL COMMENT '关联资源ID',
  `channel` ENUM('wx','ali') NOT NULL COMMENT '支付渠道：wx微信/ali支付宝',
  `amount` INT NOT NULL DEFAULT 200 COMMENT '金额（分），2元=200',
  `status` ENUM('pending','paid','closed') NOT NULL DEFAULT 'pending' COMMENT '订单状态',
  `expire_at` DATETIME NOT NULL COMMENT '订单过期时间（10分钟后）',
  `paid_at` DATETIME DEFAULT NULL COMMENT '支付时间',
  `wx_prepay_id` VARCHAR(128) DEFAULT NULL COMMENT '微信预支付ID',
  `ali_trade_no` VARCHAR(128) DEFAULT NULL COMMENT '支付宝交易号',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_client_result_status` (`client_id`, `result_id`, `status`),
  INDEX `idx_status_expire` (`status`, `expire_at`),
  INDEX `idx_client_id` (`client_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='支付订单表';

-- 解锁记录表（唯一索引确保每个浏览器每条资源只解锁一次）
CREATE TABLE IF NOT EXISTS `unlocks` (
  `id` BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  `client_id` VARCHAR(64) NOT NULL COMMENT '浏览器匿名ID',
  `result_id` BIGINT UNSIGNED NOT NULL COMMENT '关联资源ID',
  `order_no` VARCHAR(64) NOT NULL COMMENT '关联订单号',
  `unlocked_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY `uniq_client_result` (`client_id`, `result_id`),
  INDEX `idx_client_id` (`client_id`),
  INDEX `idx_result_id` (`result_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='解锁记录表';

-- 支付回调事件表（原始报文存档，排障用）
CREATE TABLE IF NOT EXISTS `pay_events` (
  `id` BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  `order_no` VARCHAR(64) DEFAULT NULL COMMENT '关联订单号（微信回调可能为空，解析后补填）',
  `channel` ENUM('wx','ali') NOT NULL COMMENT '支付渠道',
  `payload` JSON NOT NULL COMMENT '回调原始报文',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_order_no` (`order_no`),
  INDEX `idx_created_at` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='支付回调事件记录表';

-- =============================================
-- 初始化示例数据（测试用，可删除）
-- =============================================
INSERT INTO `results` (`title`, `pan_type`, `share_url`, `extract_code`, `size`) VALUES
('Python全栈开发教程（完整版）', '百度网盘', 'https://pan.baidu.com/s/demo1', 'py12', '12.4 GB'),
('考研数学全套视频课程', '阿里云盘', 'https://www.aliyundrive.com/s/demo2', NULL, '8.7 GB'),
('Adobe 2025 全家桶破解版', '夸克网盘', 'https://pan.quark.cn/s/demo3', 'ab25', '25.1 GB'),
('2025最新公务员上岸资料合集', '百度网盘', 'https://pan.baidu.com/s/demo4', 'gw25', '3.2 GB'),
('TED演讲合集（中英字幕 800部）', '115网盘', 'https://115.com/s/demo5', 'ted80', '150 GB'),
('小阿CTO架构师课程（含源码）', '阿里云盘', 'https://www.aliyundrive.com/s/demo6', 'cto45', '45.6 GB');

-- =============================================
-- 定时清理过期订单（可加入 cron job）
-- 每5分钟执行一次
-- DELETE FROM `pay_orders` WHERE status='pending' AND expire_at < NOW();
-- =============================================