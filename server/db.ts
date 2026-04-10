import { and, count, desc, eq } from "drizzle-orm";
import { drizzle, type MySql2Database } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import * as schema from "../drizzle/schema";
import type { InsertUser } from "../drizzle/schema";
import type {
  AIHistoryRecord,
  FavoriteListItem,
  ShoppingListItemRecord,
  ShoppingListSummary,
} from "../shared/types";
import { ENV } from "./_core/env";
import { logger } from "./_core/logger";

let _db: MySql2Database<typeof schema> | null = null;
let _pool: mysql.Pool | null = null;

async function createConnectionPool(): Promise<mysql.Pool> {
  if (_pool) {
    return _pool;
  }

  const databaseUrl = ENV.databaseUrl;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL environment variable is not set");
  }

  const url = new URL(databaseUrl);
  const username = decodeURIComponent(url.username);
  const password = decodeURIComponent(url.password);
  const hostname = url.hostname;
  const port = url.port ? parseInt(url.port, 10) : 3306;
  const database = url.pathname.slice(1);

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

  const connection = await _pool.getConnection();
  await connection.ping();
  connection.release();

  logger.info("[DB] Connection pool created successfully");
  return _pool;
}

export async function getDb(): Promise<MySql2Database<typeof schema> | null> {
  if (!_db) {
    try {
      const pool = await createConnectionPool();
      _db = drizzle(pool, { schema, mode: "default" });
      logger.info("[DB] Drizzle ORM initialized");
    } catch (error) {
      logger.error("[DB] Failed to initialize Drizzle ORM", {
        error: error instanceof Error ? error.message : String(error),
      });
      _db = null;
    }
  }

  return _db;
}

export async function getDbOrThrow(): Promise<MySql2Database<typeof schema>> {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not initialized");
  }
  return db;
}

export async function dbPing(): Promise<void> {
  if (!_pool) {
    await createConnectionPool();
  }

  let connection: mysql.PoolConnection | null = null;
  try {
    connection = await _pool!.getConnection();
    await connection.ping();
  } finally {
    connection?.release();
  }
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDbOrThrow();
  const values: InsertUser = { openId: user.openId };
  const updateSet: Partial<InsertUser> = {};

  const textFields = ["name", "email", "loginMethod"] as const;
  for (const field of textFields) {
    const value = user[field];
    if (value !== undefined) {
      values[field] = value ?? null;
      updateSet[field] = value ?? null;
    }
  }

  if (user.lastSignedIn !== undefined) {
    values.lastSignedIn = user.lastSignedIn;
    updateSet.lastSignedIn = user.lastSignedIn;
  } else {
    values.lastSignedIn = new Date();
    updateSet.lastSignedIn = values.lastSignedIn;
  }

  if (user.role !== undefined) {
    values.role = user.role;
    updateSet.role = user.role;
  } else if (user.openId === ENV.ownerOpenId) {
    values.role = "admin";
    updateSet.role = "admin";
  }

  await db
    .insert(schema.users)
    .values(values)
    .onDuplicateKeyUpdate({ set: updateSet });
}

export async function getUserByOpenId(openId: string): Promise<schema.User | undefined> {
  const db = await getDbOrThrow();
  const result = await db.select().from(schema.users).where(eq(schema.users.openId, openId)).limit(1);
  return result[0];
}

export async function closePool(): Promise<void> {
  if (_pool) {
    await _pool.end();
    _pool = null;
    _db = null;
    logger.info("[DB] Connection pool closed");
  }
}

export async function addFavorite(
  userId: number,
  recipeId: number,
  recipeName: string,
  recipeImage?: string
): Promise<void> {
  const db = await getDbOrThrow();
  await db.insert(schema.favorites).values({ userId, recipeId, recipeName, recipeImage });
}

export async function removeFavorite(userId: number, recipeId: number): Promise<void> {
  const db = await getDbOrThrow();
  await db
    .delete(schema.favorites)
    .where(and(eq(schema.favorites.userId, userId), eq(schema.favorites.recipeId, recipeId)));
}

export async function getUserFavorites(userId: number): Promise<FavoriteListItem[]> {
  const db = await getDbOrThrow();
  return db.select().from(schema.favorites).where(eq(schema.favorites.userId, userId));
}

export async function isFavorited(userId: number, recipeId: number): Promise<boolean> {
  const db = await getDbOrThrow();
  const result = await db
    .select({ id: schema.favorites.id })
    .from(schema.favorites)
    .where(and(eq(schema.favorites.userId, userId), eq(schema.favorites.recipeId, recipeId)))
    .limit(1);

  return result.length > 0;
}

export async function createShoppingList(
  userId: number,
  name: string,
  description?: string
): Promise<schema.ShoppingList> {
  const db = await getDbOrThrow();
  const result = await db
    .insert(schema.shoppingLists)
    .values({ userId, name, description })
    .$returningId();

  const listId = result[0]?.id;
  if (!listId) {
    throw new Error("Failed to create shopping list");
  }

  const [list] = await db
    .select()
    .from(schema.shoppingLists)
    .where(eq(schema.shoppingLists.id, listId))
    .limit(1);

  if (!list) {
    throw new Error("Created shopping list could not be reloaded");
  }

  return list;
}

export async function getUserShoppingLists(userId: number): Promise<ShoppingListSummary[]> {
  const db = await getDbOrThrow();
  const result = await db
    .select({
      id: schema.shoppingLists.id,
      userId: schema.shoppingLists.userId,
      name: schema.shoppingLists.name,
      description: schema.shoppingLists.description,
      createdAt: schema.shoppingLists.createdAt,
      updatedAt: schema.shoppingLists.updatedAt,
      itemCount: count(schema.shoppingListItems.id),
    })
    .from(schema.shoppingLists)
    .leftJoin(
      schema.shoppingListItems,
      eq(schema.shoppingLists.id, schema.shoppingListItems.shoppingListId)
    )
    .where(eq(schema.shoppingLists.userId, userId))
    .groupBy(schema.shoppingLists.id);

  return result.map(list => ({
    ...list,
    itemCount: Number(list.itemCount),
  }));
}

export async function getShoppingListByIdForUser(
  userId: number,
  shoppingListId: number
): Promise<schema.ShoppingList | null> {
  const db = await getDbOrThrow();
  const result = await db
    .select()
    .from(schema.shoppingLists)
    .where(
      and(eq(schema.shoppingLists.id, shoppingListId), eq(schema.shoppingLists.userId, userId))
    )
    .limit(1);

  return result[0] ?? null;
}

export async function getShoppingListItemByIdForUser(
  userId: number,
  itemId: number
): Promise<schema.ShoppingListItem | null> {
  const db = await getDbOrThrow();
  const result = await db
    .select({ item: schema.shoppingListItems })
    .from(schema.shoppingListItems)
    .innerJoin(
      schema.shoppingLists,
      eq(schema.shoppingListItems.shoppingListId, schema.shoppingLists.id)
    )
    .where(and(eq(schema.shoppingListItems.id, itemId), eq(schema.shoppingLists.userId, userId)))
    .limit(1);

  return result[0]?.item ?? null;
}

export async function addShoppingListItem(
  shoppingListId: number,
  ingredient: string,
  quantity?: string,
  unit?: string
): Promise<schema.ShoppingListItem> {
  const db = await getDbOrThrow();
  const result = await db
    .insert(schema.shoppingListItems)
    .values({
      shoppingListId,
      ingredient,
      quantity,
      unit,
      checked: 0,
    })
    .$returningId();

  const itemId = result[0]?.id;
  if (!itemId) {
    throw new Error("Failed to create shopping list item");
  }

  const [item] = await db
    .select()
    .from(schema.shoppingListItems)
    .where(eq(schema.shoppingListItems.id, itemId))
    .limit(1);

  if (!item) {
    throw new Error("Created shopping list item could not be reloaded");
  }

  return item;
}

export async function getShoppingListItems(
  shoppingListId: number
): Promise<ShoppingListItemRecord[]> {
  const db = await getDbOrThrow();
  const result = await db
    .select()
    .from(schema.shoppingListItems)
    .where(eq(schema.shoppingListItems.shoppingListId, shoppingListId));

  return result.map(item => ({
    ...item,
    checked: item.checked === 1,
  }));
}

export async function updateShoppingListItemStatus(
  itemId: number,
  checked: boolean
): Promise<void> {
  const db = await getDbOrThrow();
  await db
    .update(schema.shoppingListItems)
    .set({ checked: checked ? 1 : 0 })
    .where(eq(schema.shoppingListItems.id, itemId));
}

export async function deleteShoppingList(listId: number): Promise<void> {
  const db = await getDbOrThrow();
  await db.delete(schema.shoppingListItems).where(eq(schema.shoppingListItems.shoppingListId, listId));
  await db.delete(schema.shoppingLists).where(eq(schema.shoppingLists.id, listId));
}

export async function deleteShoppingListItem(itemId: number): Promise<void> {
  const db = await getDbOrThrow();
  await db.delete(schema.shoppingListItems).where(eq(schema.shoppingListItems.id, itemId));
}

export async function addAIRecognitionHistory(
  userId: number,
  imageUrl: string,
  recognizedIngredients: string[],
  recommendedRecipes?: string[],
  requestId?: string
): Promise<void> {
  const db = await getDbOrThrow();
  await db.insert(schema.aiRecognitionHistory).values({
    userId,
    imageUrl,
    recognizedIngredients: JSON.stringify(recognizedIngredients),
    recommendedRecipes: JSON.stringify(recommendedRecipes ?? []),
    requestId,
  });
}

export async function getUserAIRecognitionHistory(
  userId: number,
  limit = 20
): Promise<AIHistoryRecord[]> {
  const db = await getDbOrThrow();
  const result = await db
    .select()
    .from(schema.aiRecognitionHistory)
    .where(eq(schema.aiRecognitionHistory.userId, userId))
    .orderBy(desc(schema.aiRecognitionHistory.createdAt))
    .limit(limit);

  return result.map(record => ({
    id: record.id,
    userId: record.userId,
    imageUrl: record.imageUrl,
    recognizedIngredients: safeParseStringArray(record.recognizedIngredients),
    recommendedRecipes: safeParseStringArray(record.recommendedRecipes),
    requestId: record.requestId,
    createdAt: record.createdAt,
  }));
}

export async function getAIRecognitionHistoryByIdForUser(
  userId: number,
  historyId: number
): Promise<AIHistoryRecord | null> {
  const db = await getDbOrThrow();
  const result = await db
    .select()
    .from(schema.aiRecognitionHistory)
    .where(
      and(eq(schema.aiRecognitionHistory.id, historyId), eq(schema.aiRecognitionHistory.userId, userId))
    )
    .limit(1);

  const record = result[0];
  if (!record) {
    return null;
  }

  return {
    id: record.id,
    userId: record.userId,
    imageUrl: record.imageUrl,
    recognizedIngredients: safeParseStringArray(record.recognizedIngredients),
    recommendedRecipes: safeParseStringArray(record.recommendedRecipes),
    requestId: record.requestId,
    createdAt: record.createdAt,
  };
}

export async function deleteAIRecognitionHistory(userId: number, historyId: number): Promise<void> {
  const db = await getDbOrThrow();
  await db
    .delete(schema.aiRecognitionHistory)
    .where(
      and(eq(schema.aiRecognitionHistory.id, historyId), eq(schema.aiRecognitionHistory.userId, userId))
    );
}

function safeParseStringArray(raw: string | null): string[] {
  if (!raw) {
    return [];
  }

  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((value): value is string => typeof value === "string") : [];
  } catch {
    return [];
  }
}
