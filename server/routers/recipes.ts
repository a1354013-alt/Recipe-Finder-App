/**
 * Recipe-related tRPC routes
 * 
 * Router layer: Input validation + Auth + Service call
 * Business logic is delegated to service layer
 */

import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { logger } from '../_core/logger';
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
  deleteShoppingListItem,
} from "../services/shoppingListService";

import {
  getUserHistory,
  deleteHistory,
} from '../services/aiHistoryService';
import {
  searchRecipes,
  getRecipeDetails,
  getRandomRecipes,
  getRecipesByCuisine,
  getRecipesByDiet,
} from '../services/recipeService';

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
        logger.info('[RecipeRouter] Creating shopping list', `Name: ${input.name}`, { userId: ctx.user.id, requestId: ctx.requestId });
        const list = await createNewShoppingList(ctx.user.id, input.name, input.description, ctx.requestId);
        return { success: true, list: { id: list.id, name: list.name, description: list.description } };
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
          quantity: z.coerce.number().optional(),
          unit: z.string().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        await addItemToList(
          ctx.user.id,
          input.shoppingListId,
          input.ingredient,
          input.quantity || 1,
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

    deleteItem: protectedProcedure
      .input(z.object({ itemId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        await deleteShoppingListItem(ctx.user.id, input.itemId, ctx.requestId);
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

    delete: protectedProcedure
      .input(z.object({ historyId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        await deleteHistory(ctx.user.id, input.historyId, ctx.requestId);
        return { success: true, historyId: input.historyId };
      }),
  }),

  /**
   * Recipe Search and Discovery Routes
   * 
   * These routes provide real recipe data
   * Primary source: backend service
   * Fallback: mock data (for development/offline)
   */
  search: protectedProcedure
    .input(
      z.object({
        query: z.string(),
        offset: z.number().default(0),
        limit: z.number().default(12),
        filters: z
          .object({
            cookingTime: z.array(z.enum(["quick", "medium", "long"])).optional(),
            calories: z.array(z.enum(["low", "medium", "high"])).optional(),
            difficulty: z.array(z.enum(["easy", "medium", "hard"])).optional(),
            diets: z.array(z.string()).optional(),
          })
          .optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      logger.info(
        '[RecipeRouter] Searching recipes',
        `Query: ${input.query}`,
        { query: input.query, requestId: ctx.requestId }
      );
      const result = await searchRecipes({
        query: input.query,
        offset: input.offset,
        limit: input.limit,
        filters: input.filters,
        requestId: ctx.requestId,
      });
      return result;
    }),

  details: protectedProcedure
    .input(z.object({ recipeId: z.number() }))
    .query(async ({ ctx, input }) => {
      logger.info('[RecipeRouter] Fetching recipe details', `Recipe ID: ${input.recipeId}`, { recipeId: input.recipeId, requestId: ctx.requestId });
      const recipe = await getRecipeDetails(input.recipeId, ctx.requestId);
      return recipe;
    }),

  random: protectedProcedure
    .input(z.object({ number: z.number().default(12) }))
    .query(async ({ ctx, input }) => {
      logger.info('[RecipeRouter] Fetching random recipes', `Count: ${input.number}`, { count: input.number, requestId: ctx.requestId });
      const recipes = await getRandomRecipes(input.number, ctx.requestId);
      return recipes;
    }),

  byCuisine: protectedProcedure
    .input(
      z.object({
        cuisine: z.string(),
        number: z.number().default(12),
      })
    )
    .query(async ({ ctx, input }) => {
      logger.info('[RecipeRouter] Fetching recipes by cuisine', `Cuisine: ${input.cuisine}`, { cuisine: input.cuisine, count: input.number, requestId: ctx.requestId });
      const recipes = await getRecipesByCuisine(input.cuisine, input.number, ctx.requestId);
      return recipes;
    }),

  byDiet: protectedProcedure
    .input(
      z.object({
        diet: z.string(),
        number: z.number().default(12),
      })
    )
    .query(async ({ ctx, input }) => {
      logger.info('[RecipeRouter] Fetching recipes by diet', `Diet: ${input.diet}`, { diet: input.diet, count: input.number, requestId: ctx.requestId });
      const recipes = await getRecipesByDiet(input.diet, input.number, ctx.requestId);
      return recipes;
    }),
});
