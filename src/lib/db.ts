// 服务器端检测是否配置了数据库（Node.js 环境变量）
// 注意：这个文件应该只被服务端代码导入，不能被 "use client" 组件直接导入

const dbConfigured =
  !!process.env.DB_HOST && !!process.env.DB_USER && !!process.env.DB_PASSWORD && !!process.env.DB_NAME;

export const isDemoMode = !dbConfigured;

// 生产模式：mysql2 连接池
// 注意：此文件只能被 API Route / Server Component 导入，不能被 Client Component 导入
import mysql from "mysql2/promise";

if (!dbConfigured) {
  console.warn("[pansou] ⚠️ 数据库未配置，进入演示模式（demo mode）");
} else {
  console.log(`[pansou] ✅ 数据库已配置：${process.env.DB_HOST}:${process.env.DB_PORT ?? 3306}/${process.env.DB_NAME}`);
}

const globalForDb = global as unknown as { pool?: mysql.Pool };

export const pool =
  dbConfigured
    ? (globalForDb.pool ??
        mysql.createPool({
          host: process.env.DB_HOST!,
          port: Number(process.env.DB_PORT ?? 3306),
          user: process.env.DB_USER!,
          password: process.env.DB_PASSWORD!,
          database: process.env.DB_NAME!,
          connectionLimit: 5,
          timezone: "Z",
        }))
    : (globalForDb.pool as any);

if (dbConfigured && !globalForDb.pool) globalForDb.pool = pool;