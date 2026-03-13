/**
 * Recipe-related tRPC routes
 * Handles favorites, shopping lists, and AI recognition history
 */

import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import {
  addFavorite,
  removeFavorite,
  getUserFavorites,
  isFavorited,
  createShoppingList,
  getUserShoppingLists,
  addShoppingListItem,
  getShoppingListItems,
  updateShoppingListItemStatus,
  addAIRecognitionHistory,
  getUserAIRecognitionHistory,
} from "../db";

export const recipeRouter = router({
  /**
   * Favorites routes
   */
  favorites: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      return await getUserFavorites(ctx.user.id);
    }),

    add: protectedProcedure
      .input(
        z.object({
          recipeId: z.number(),
          recipeName: z.string(),
          recipeImage: z.string().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        await addFavorite(ctx.user.id, input.recipeId, input.recipeName, input.recipeImage);
        return { success: true };
      }),

    remove: protectedProcedure
      .input(z.object({ recipeId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        await removeFavorite(ctx.user.id, input.recipeId);
        return { success: true };
      }),

    check: protectedProcedure
      .input(z.object({ recipeId: z.number() }))
      .query(async ({ ctx, input }) => {
        const favorited = await isFavorited(ctx.user.id, input.recipeId);
        return { favorited };
      }),
  }),

  /**
   * Shopping lists routes
   */
  shoppingLists: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      return await getUserShoppingLists(ctx.user.id);
    }),

    create: protectedProcedure
      .input(
        z.object({
          name: z.string(),
          description: z.string().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        await createShoppingList(ctx.user.id, input.name, input.description);
        return { success: true };
      }),

    items: protectedProcedure
      .input(z.object({ shoppingListId: z.number() }))
      .query(async ({ input }) => {
        return await getShoppingListItems(input.shoppingListId);
      }),

    addItem: protectedProcedure
      .input(
        z.object({
          shoppingListId: z.number(),
          ingredient: z.string(),
          quantity: z.string().optional(),
          unit: z.string().optional(),
        })
      )
      .mutation(async ({ input }) => {
        await addShoppingListItem(input.shoppingListId, input.ingredient, input.quantity, input.unit);
        return { success: true };
      }),

    updateItemStatus: protectedProcedure
      .input(
        z.object({
          itemId: z.number(),
          checked: z.boolean(),
        })
      )
      .mutation(async ({ input }) => {
        await updateShoppingListItemStatus(input.itemId, input.checked);
        return { success: true };
      }),
  }),

  /**
   * AI recognition history routes
   */
  aiHistory: router({
    list: protectedProcedure
      .input(z.object({ limit: z.number().default(20) }))
      .query(async ({ ctx, input }) => {
        return await getUserAIRecognitionHistory(ctx.user.id, input.limit);
      }),

    add: protectedProcedure
      .input(
        z.object({
          imageUrl: z.string(),
          recognizedIngredients: z.array(z.string()),
          recommendedRecipes: z.array(z.string()).optional(),
          requestId: z.string().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        await addAIRecognitionHistory(
          ctx.user.id,
          input.imageUrl,
          input.recognizedIngredients,
          input.recommendedRecipes,
          input.requestId
        );
        return { success: true };
      }),
  }),
});
