import mysql from "mysql2/promise";

export type RowDataPacket = mysql.RowDataPacket;

const dbConfigured =
  !!process.env.DB_HOST && !!process.env.DB_USER && !!process.env.DB_PASSWORD && !!process.env.DB_NAME;

export const isDemoMode = !dbConfigured;

if (!dbConfigured) {
  console.warn("[pansou] ⚠️ 数据库未配置，进入演示模式（demo mode）");
} else {
  console.log(`[pansou] ✅ 数据库已配置：${process.env.DB_HOST}:${process.env.DB_PORT ?? 3306}/${process.env.DB_NAME}`);
}

// mysql2 连接池（Vercel Serverless 友好）
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