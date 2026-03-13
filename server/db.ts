import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import { InsertUser, users } from "../drizzle/schema";
import { ENV } from './_core/env';
import { logger } from './_core/logger';

let _db: any = null; // Drizzle ORM 實例
let _pool: mysql.Pool | null = null;

/**
 * 建立 MySQL 連接池
 * 
 * 修正前：直接將 DATABASE_URL 字串傳給 drizzle
 * 修正後：
 * - 使用 mysql2/promise 建立連接池
 * - 支援連接池管理（連接復用、自動重連）
 * - 更安全的連接管理
 */
async function createConnectionPool(): Promise<mysql.Pool> {
  if (_pool) {
    return _pool;
  }

  try {
    const databaseUrl = ENV.databaseUrl;
    if (!databaseUrl) {
      throw new Error("DATABASE_URL environment variable is not set");
    }

    // 解析 DATABASE_URL
    // 格式：mysql://user:password@host:port/database
    const url = new URL(databaseUrl);
    const username = decodeURIComponent(url.username);
    const password = decodeURIComponent(url.password);
    const hostname = url.hostname;
    const port = url.port ? parseInt(url.port) : 3306;
    const database = url.pathname.slice(1); // 移除開頭的 /

    logger.info("[DB] Creating connection pool", "Connecting to database", {
      host: hostname,
      port,
      database,
      user: username,
    });

    _pool = mysql.createPool({
      host: hostname,
      port,
      user: username,
      password,
      database,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
      enableKeepAlive: true,
      keepAliveInitialDelay: 0,
    });

    // 測試連接
    const connection = await _pool.getConnection();
    await connection.ping();
    connection.release();

    logger.info("[DB] Connection pool created successfully");
    return _pool;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error("[DB] Failed to create connection pool", { error: errorMessage });
    throw error;
  }
}

/**
 * 取得 Drizzle ORM 實例
 */
export async function getDb() {
  if (!_db) {
    try {
      const pool = await createConnectionPool();
      _db = drizzle(pool);
      logger.info("[DB] Drizzle ORM initialized");
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error("[DB] Failed to initialize Drizzle ORM", { error: errorMessage });
      _db = null;
    }
  }
  return _db;
}

/**
 * Upsert 用戶
 * 
 * 邏輯：
 * - openId 必要（唯一鍵）
 * - 其他欄位可選
 * - 如果用戶已存在，更新指定欄位
 * - 如果用戶是 owner，自動設定為 admin
 */
export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    logger.error("[DB] Database not available for upsert");
    throw new Error("Database not available");
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });

    logger.info("[DB] User upserted", "User record updated", { openId: user.openId });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error("[DB] Failed to upsert user", { error: errorMessage, openId: user.openId });
    throw error;
  }
}

/**
 * 根據 openId 取得用戶
 */
export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    logger.error("[DB] Database not available for query");
    throw new Error("Database not available");
  }

  try {
    const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
    logger.info("[DB] User query completed", "Query executed", { openId, found: result.length > 0 });
    return result.length > 0 ? result[0] : undefined;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error("[DB] Failed to get user", { error: errorMessage, openId });
    throw error;
  }
}

/**
 * 關閉連接池（用於優雅關閉）
 */
export async function closePool(): Promise<void> {
  if (_pool) {
    try {
      await _pool.end();
      logger.info("[DB] Connection pool closed");
      _pool = null;
      _db = null;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error("[DB] Failed to close connection pool", { error: errorMessage });
    }
  }
}
