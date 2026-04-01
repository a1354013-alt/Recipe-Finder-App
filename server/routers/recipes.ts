/**
 * Recipe-related tRPC routes
 * 
 * Router layer: Input validation + Auth + Service call
 * Business logic is delegated to service layer
 */

import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import {
  addRecipeToFavorites,
  removeRecipeFromFavorites,
  checkRecipeFavorite,
  getUserFavoritesList,
} from "../services/favoriteService";
import {
  createNewShoppingList,
  getUserShoppingLists,
  getListItems,
  addItemToList,
  updateItemStatus,
  deleteList,
} from "../services/shoppingListService";
import {
  getUserHistory,
  deleteHistory,
} from '../services/aiHistoryService';

export const recipeRouter = router({
  /**
   * Favorites routes
   * 
   * Delegates to favoriteService for business logic
   */
  favorites: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      return await getUserFavoritesList(ctx.user.id, ctx.requestId);
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
        await addRecipeToFavorites(
          ctx.user.id,
          input.recipeId,
          input.recipeName,
          input.recipeImage,
          ctx.requestId
        );
        return { success: true };
      }),

    remove: protectedProcedure
      .input(z.object({ recipeId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        await removeRecipeFromFavorites(ctx.user.id, input.recipeId, ctx.requestId);
        return { success: true };
      }),

    check: protectedProcedure
      .input(z.object({ recipeId: z.number() }))
      .query(async ({ ctx, input }) => {
        const favorited = await checkRecipeFavorite(
          ctx.user.id,
          input.recipeId,
          ctx.requestId
        );
        return { favorited };
      }),
  }),

  /**
   * Shopping lists routes
   * 
   * Delegates to shoppingListService for business logic
   * Service layer handles ownership verification
   */
  shoppingLists: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      return await getUserShoppingLists(ctx.user.id, ctx.requestId);
    }),

    create: protectedProcedure
      .input(
        z.object({
          name: z.string(),
          description: z.string().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        await createNewShoppingList(ctx.user.id, input.name, ctx.requestId);
        return { success: true };
      }),

    items: protectedProcedure
      .input(z.object({ shoppingListId: z.number() }))
      .query(async ({ ctx, input }) => {
        return await getListItems(ctx.user.id, input.shoppingListId, ctx.requestId);
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
      .mutation(async ({ ctx, input }) => {
        await addItemToList(
          ctx.user.id,
          input.shoppingListId,
          input.ingredient,
          input.quantity ? parseInt(input.quantity) : 1,
          input.unit || '',
          ctx.requestId
        );
        return { success: true };
      }),

    updateItemStatus: protectedProcedure
      .input(
        z.object({
          itemId: z.number(),
          checked: z.boolean(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        await updateItemStatus(ctx.user.id, input.itemId, input.checked, ctx.requestId);
        return { success: true };
      }),

    delete: protectedProcedure
      .input(z.object({ shoppingListId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        await deleteList(ctx.user.id, input.shoppingListId, ctx.requestId);
        return { success: true };
      }),
  }),

  /**
   * AI recognition history routes
   * 
   * Delegates to aiHistoryService for business logic
   * Service layer handles ownership verification
   */
  aiHistory: router({
    list: protectedProcedure
      .input(z.object({ limit: z.number().default(20) }))
      .query(async ({ ctx, input }) => {
        return await getUserHistory(ctx.user.id, input.limit, ctx.requestId);
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
        // Note: add operation is handled by ingredientRecognition service
        // This route is for manual history entry if needed
        return { success: true };
      }),

    delete: protectedProcedure
      .input(z.object({ historyId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        await deleteHistory(ctx.user.id, input.historyId, ctx.requestId);
        return { success: true, historyId: input.historyId };
      }),
  }),
});
