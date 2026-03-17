/**
 * Favorite Service Layer
 * 
 * Encapsulates favorite-related business logic
 * - Add/remove favorites
 * - Check favorite status
 * - List user favorites
 */

import {
  addFavorite,
  removeFavorite,
  getUserFavorites,
  isFavorited,
} from '../db';
import { logger } from '../_core/logger';

/**
 * Add a recipe to user favorites
 */
export async function addRecipeToFavorites(
  userId: number,
  recipeId: number,
  recipeName: string,
  recipeImage?: string,
  requestId?: string
): Promise<void> {
  try {
    logger.info(
      '[FavoriteService] Adding to favorites',
      `Recipe: ${recipeName}`,
      { userId, recipeId, requestId }
    );

    await addFavorite(userId, recipeId, recipeName, recipeImage);

    logger.info(
      '[FavoriteService] Added to favorites',
      `Recipe: ${recipeName}`,
      { userId, recipeId, requestId }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error(
      '[FavoriteService] Failed to add favorite',
      { error: errorMessage, userId, recipeId, requestId }
    );
    throw error;
  }
}

/**
 * Remove a recipe from user favorites
 */
export async function removeRecipeFromFavorites(
  userId: number,
  recipeId: number,
  requestId?: string
): Promise<void> {
  try {
    logger.info(
      '[FavoriteService] Removing from favorites',
      `Recipe ID: ${recipeId}`,
      { userId, recipeId, requestId }
    );

    await removeFavorite(userId, recipeId);

    logger.info(
      '[FavoriteService] Removed from favorites',
      `Recipe ID: ${recipeId}`,
      { userId, recipeId, requestId }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error(
      '[FavoriteService] Failed to remove favorite',
      { error: errorMessage, userId, recipeId, requestId }
    );
    throw error;
  }
}

/**
 * Check if a recipe is favorited by user
 */
export async function checkRecipeFavorite(
  userId: number,
  recipeId: number,
  requestId?: string
): Promise<boolean> {
  try {
    const favorited = await isFavorited(userId, recipeId);

    logger.info(
      '[FavoriteService] Favorite status checked',
      `Favorited: ${favorited}`,
      { userId, recipeId, favorited, requestId }
    );

    return favorited;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error(
      '[FavoriteService] Failed to check favorite status',
      { error: errorMessage, userId, recipeId, requestId }
    );
    throw error;
  }
}

/**
 * Get all user favorites
 */
export async function getUserFavoritesList(
  userId: number,
  requestId?: string
): Promise<any[]> {
  try {
    logger.info(
      '[FavoriteService] Fetching user favorites',
      `User ID: ${userId}`,
      { userId, requestId }
    );

    const favorites = await getUserFavorites(userId);

    logger.info(
      '[FavoriteService] User favorites fetched',
      `Found ${favorites.length} favorites`,
      { userId, count: favorites.length, requestId }
    );

    return favorites;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error(
      '[FavoriteService] Failed to fetch user favorites',
      { error: errorMessage, userId, requestId }
    );
    throw error;
  }
}
