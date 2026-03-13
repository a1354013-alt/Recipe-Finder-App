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
 * 取得 Drizzle ORM 實例或拋出錯誤
 * 用於關鍵路徑，確保 DB 初始化成功
 */
export async function getDbOrThrow() {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not initialized");
  }
  return db;
}

/**
 * 檢查 DB 連接是否可用
 * 使用 connection.ping() 進行可靠的檢查
 */
export async function dbPing(): Promise<void> {
  if (!_pool) {
    throw new Error("Connection pool not initialized");
  }

  let connection: mysql.PoolConnection | null = null;
  try {
    connection = await _pool.getConnection();
    await connection.ping();
  } finally {
    if (connection) {
      connection.release();
    }
  }
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

  const db = await getDbOrThrow();

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
  const db = await getDbOrThrow();

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


/**
 * ==========================================
 * Favorites 相關函數
 * ==========================================
 */

export async function addFavorite(userId: number, recipeId: number, recipeName: string, recipeImage?: string) {
  const db = await getDbOrThrow();
  const { favorites } = await import("../drizzle/schema");

  try {
    await db.insert(favorites).values({
      userId,
      recipeId,
      recipeName,
      recipeImage,
    });
    logger.info("[DB] Favorite added", "Recipe added to favorites", { userId, recipeId });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error("[DB] Failed to add favorite", { error: errorMessage, userId, recipeId });
    throw error;
  }
}

export async function removeFavorite(userId: number, recipeId: number) {
  const db = await getDbOrThrow();
  const { favorites } = await import("../drizzle/schema");

  try {
    await db.delete(favorites).where(
      eq(favorites.userId, userId) && eq(favorites.recipeId, recipeId)
    );
    logger.info("[DB] Favorite removed", "Recipe removed from favorites", { userId, recipeId });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error("[DB] Failed to remove favorite", { error: errorMessage, userId, recipeId });
    throw error;
  }
}

export async function getUserFavorites(userId: number) {
  const db = await getDbOrThrow();
  const { favorites } = await import("../drizzle/schema");

  try {
    const result = await db.select().from(favorites).where(eq(favorites.userId, userId));
    logger.info("[DB] Favorites retrieved", "User favorites fetched", { userId, count: result.length });
    return result;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error("[DB] Failed to get favorites", { error: errorMessage, userId });
    throw error;
  }
}

export async function isFavorited(userId: number, recipeId: number): Promise<boolean> {
  const db = await getDbOrThrow();
  const { favorites } = await import("../drizzle/schema");

  try {
    const result = await db.select().from(favorites).where(
      eq(favorites.userId, userId) && eq(favorites.recipeId, recipeId)
    ).limit(1);
    return result.length > 0;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error("[DB] Failed to check favorite status", { error: errorMessage, userId, recipeId });
    return false;
  }
}

/**
 * ==========================================
 * Shopping Lists 相關函數
 * ==========================================
 */

export async function createShoppingList(userId: number, name: string, description?: string) {
  const db = await getDbOrThrow();
  const { shoppingLists } = await import("../drizzle/schema");

  try {
    const result = await db.insert(shoppingLists).values({
      userId,
      name,
      description,
    });
    logger.info("[DB] Shopping list created", "New shopping list created", { userId, name });
    return result;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error("[DB] Failed to create shopping list", { error: errorMessage, userId });
    throw error;
  }
}

export async function getUserShoppingLists(userId: number) {
  const db = await getDbOrThrow();
  const { shoppingLists } = await import("../drizzle/schema");

  try {
    const result = await db.select().from(shoppingLists).where(eq(shoppingLists.userId, userId));
    logger.info("[DB] Shopping lists retrieved", "User shopping lists fetched", { userId, count: result.length });
    return result;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error("[DB] Failed to get shopping lists", { error: errorMessage, userId });
    throw error;
  }
}

export async function addShoppingListItem(shoppingListId: number, ingredient: string, quantity?: string, unit?: string) {
  const db = await getDbOrThrow();
  const { shoppingListItems } = await import("../drizzle/schema");

  try {
    await db.insert(shoppingListItems).values({
      shoppingListId,
      ingredient,
      quantity,
      unit,
      checked: 0,
    });
    logger.info("[DB] Shopping list item added", "Item added to shopping list", { shoppingListId, ingredient });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error("[DB] Failed to add shopping list item", { error: errorMessage, shoppingListId });
    throw error;
  }
}

export async function getShoppingListItems(shoppingListId: number) {
  const db = await getDbOrThrow();
  const { shoppingListItems } = await import("../drizzle/schema");

  try {
    const result = await db.select().from(shoppingListItems).where(eq(shoppingListItems.shoppingListId, shoppingListId));
    logger.info("[DB] Shopping list items retrieved", "Items fetched", { shoppingListId, count: result.length });
    return result;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error("[DB] Failed to get shopping list items", { error: errorMessage, shoppingListId });
    throw error;
  }
}

export async function updateShoppingListItemStatus(itemId: number, checked: boolean) {
  const db = await getDbOrThrow();
  const { shoppingListItems } = await import("../drizzle/schema");

  try {
    await db.update(shoppingListItems).set({ checked: checked ? 1 : 0 }).where(eq(shoppingListItems.id, itemId));
    logger.info("[DB] Shopping list item updated", "Item status updated", { itemId, checked });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error("[DB] Failed to update shopping list item", { error: errorMessage, itemId });
    throw error;
  }
}

/**
 * ==========================================
 * AI Recognition History 相關函數
 * ==========================================
 */

export async function addAIRecognitionHistory(
  userId: number,
  imageUrl: string,
  recognizedIngredients: string[],
  recommendedRecipes?: string[],
  requestId?: string
) {
  const db = await getDbOrThrow();
  const { aiRecognitionHistory } = await import("../drizzle/schema");

  try {
    await db.insert(aiRecognitionHistory).values({
      userId,
      imageUrl,
      recognizedIngredients: JSON.stringify(recognizedIngredients),
      recommendedRecipes: recommendedRecipes ? JSON.stringify(recommendedRecipes) : null,
      requestId,
    });
    logger.info("[DB] AI recognition history added", "History recorded", { userId, requestId });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error("[DB] Failed to add AI recognition history", { error: errorMessage, userId });
    throw error;
  }
}

export async function getUserAIRecognitionHistory(userId: number, limit: number = 20) {
  const db = await getDbOrThrow();
  const { aiRecognitionHistory } = await import("../drizzle/schema");

  try {
    const result = await db.select().from(aiRecognitionHistory)
      .where(eq(aiRecognitionHistory.userId, userId))
      .orderBy((t: any) => t.createdAt)
      .limit(limit);
    
    logger.info("[DB] AI recognition history retrieved", "History fetched", { userId, count: result.length });
    return result;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error("[DB] Failed to get AI recognition history", { error: errorMessage, userId });
    throw error;
  }
}
