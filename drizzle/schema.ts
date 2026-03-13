import { int, mysqlEnum, mysqlTable, text, timestamp, varchar } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 * Extend this file with additional tables as your product grows.
 * Columns use camelCase to match both database fields and generated types.
 */
export const users = mysqlTable("users", {
  /**
   * Surrogate primary key. Auto-incremented numeric value managed by the database.
   * Use this for relations between tables.
   */
  id: int("id").autoincrement().primaryKey(),
  /** Manus OAuth identifier (openId) returned from the OAuth callback. Unique per user. */
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * Audit logs table
 * Records sensitive operations for security audit and compliance
 */
export const auditLogs = mysqlTable("auditLogs", {
  id: int("id").autoincrement().primaryKey(),
  action: varchar("action", { length: 64 }).notNull(), // e.g., oauth_login_success, ai_provider_changed
  userId: int("userId"), // Optional, for public operations
  requestId: varchar("requestId", { length: 128 }), // For tracing
  status: mysqlEnum("status", ["success", "failure"]).notNull(),
  metadata: text("metadata"), // JSON string for additional context
  details: text("details"), // Optional error message or details
  timestamp: timestamp("timestamp").defaultNow().notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type AuditLog = typeof auditLogs.$inferSelect;
export type InsertAuditLog = typeof auditLogs.$inferInsert;

/**
 * Favorites table
 * Stores user's favorite recipes
 */
export const favorites = mysqlTable("favorites", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  recipeId: int("recipeId").notNull(),
  recipeName: varchar("recipeName", { length: 255 }).notNull(),
  recipeImage: text("recipeImage"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Favorite = typeof favorites.$inferSelect;
export type InsertFavorite = typeof favorites.$inferInsert;

/**
 * Shopping lists table
 * Stores user's shopping lists
 */
export const shoppingLists = mysqlTable("shoppingLists", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type ShoppingList = typeof shoppingLists.$inferSelect;
export type InsertShoppingList = typeof shoppingLists.$inferInsert;

/**
 * Shopping list items table
 * Stores items in a shopping list
 */
export const shoppingListItems = mysqlTable("shoppingListItems", {
  id: int("id").autoincrement().primaryKey(),
  shoppingListId: int("shoppingListId").notNull(),
  ingredient: varchar("ingredient", { length: 255 }).notNull(),
  quantity: varchar("quantity", { length: 100 }),
  unit: varchar("unit", { length: 50 }),
  checked: int("checked").default(0).notNull(), // 0 = unchecked, 1 = checked
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type ShoppingListItem = typeof shoppingListItems.$inferSelect;
export type InsertShoppingListItem = typeof shoppingListItems.$inferInsert;

/**
 * AI recognition history table
 * Records user's AI ingredient recognition and recipe recommendations
 */
export const aiRecognitionHistory = mysqlTable("aiRecognitionHistory", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  imageUrl: text("imageUrl").notNull(),
  recognizedIngredients: text("recognizedIngredients").notNull(), // JSON array
  recommendedRecipes: text("recommendedRecipes"), // JSON array
  requestId: varchar("requestId", { length: 128 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type AIRecognitionHistory = typeof aiRecognitionHistory.$inferSelect;
export type InsertAIRecognitionHistory = typeof aiRecognitionHistory.$inferInsert;
