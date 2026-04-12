import { relations } from "drizzle-orm";
import {
  aiRecognitionHistory,
  favorites,
  shoppingListItems,
  shoppingLists,
  users,
} from "./schema";

export const usersRelations = relations(users, ({ many }) => ({
  favorites: many(favorites),
  shoppingLists: many(shoppingLists),
  aiRecognitionHistory: many(aiRecognitionHistory),
}));

export const favoritesRelations = relations(favorites, ({ one }) => ({
  user: one(users, {
    fields: [favorites.userId],
    references: [users.id],
  }),
}));

export const shoppingListsRelations = relations(shoppingLists, ({ many }) => ({
  items: many(shoppingListItems),
}));

export const shoppingListItemsRelations = relations(shoppingListItems, ({ one }) => ({
  shoppingList: one(shoppingLists, {
    fields: [shoppingListItems.shoppingListId],
    references: [shoppingLists.id],
  }),
}));

export const aiRecognitionHistoryRelations = relations(aiRecognitionHistory, ({ one }) => ({
  user: one(users, {
    fields: [aiRecognitionHistory.userId],
    references: [users.id],
  }),
}));
