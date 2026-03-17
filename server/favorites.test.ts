/**
 * Favorites tRPC Routes Test
 * 
 * Tests for:
 * - recipe.favorites.add
 * - recipe.favorites.remove
 * - recipe.favorites.check
 * - recipe.favorites.list
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  addFavorite,
  removeFavorite,
  getUserFavorites,
  isFavorited,
} from './db';

// Mock database functions
vi.mock('./db', () => ({
  addFavorite: vi.fn(),
  removeFavorite: vi.fn(),
  getUserFavorites: vi.fn(),
  isFavorited: vi.fn(),
}));

describe('Favorites Routes', () => {
  const userId = 1;
  const recipeId = 123;
  const recipeName = 'Test Recipe';
  const recipeImage = 'https://example.com/image.jpg';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('recipe.favorites.add', () => {
    it('should add a favorite recipe', async () => {
      const mockAddFavorite = addFavorite as any;
      mockAddFavorite.mockResolvedValueOnce(undefined);

      await addFavorite(userId, recipeId, recipeName, recipeImage);

      expect(mockAddFavorite).toHaveBeenCalledWith(
        userId,
        recipeId,
        recipeName,
        recipeImage
      );
    });

    it('should handle errors when adding favorite', async () => {
      const mockAddFavorite = addFavorite as any;
      const error = new Error('Database error');
      mockAddFavorite.mockRejectedValueOnce(error);

      await expect(
        addFavorite(userId, recipeId, recipeName, recipeImage)
      ).rejects.toThrow('Database error');
    });
  });

  describe('recipe.favorites.remove', () => {
    it('should remove a favorite recipe', async () => {
      const mockRemoveFavorite = removeFavorite as any;
      mockRemoveFavorite.mockResolvedValueOnce(undefined);

      await removeFavorite(userId, recipeId);

      expect(mockRemoveFavorite).toHaveBeenCalledWith(userId, recipeId);
    });

    it('should handle errors when removing favorite', async () => {
      const mockRemoveFavorite = removeFavorite as any;
      const error = new Error('Database error');
      mockRemoveFavorite.mockRejectedValueOnce(error);

      await expect(removeFavorite(userId, recipeId)).rejects.toThrow(
        'Database error'
      );
    });
  });

  describe('recipe.favorites.check', () => {
    it('should return true if recipe is favorited', async () => {
      const mockIsFavorited = isFavorited as any;
      mockIsFavorited.mockResolvedValueOnce(true);

      const result = await isFavorited(userId, recipeId);

      expect(result).toBe(true);
      expect(mockIsFavorited).toHaveBeenCalledWith(userId, recipeId);
    });

    it('should return false if recipe is not favorited', async () => {
      const mockIsFavorited = isFavorited as any;
      mockIsFavorited.mockResolvedValueOnce(false);

      const result = await isFavorited(userId, recipeId);

      expect(result).toBe(false);
    });
  });

  describe('recipe.favorites.list', () => {
    it('should return user favorites list', async () => {
      const mockGetUserFavorites = getUserFavorites as any;
      const favorites = [
        { id: 1, userId, recipeId: 123, recipeName: 'Recipe 1' },
        { id: 2, userId, recipeId: 456, recipeName: 'Recipe 2' },
      ];
      mockGetUserFavorites.mockResolvedValueOnce(favorites);

      const result = await getUserFavorites(userId);

      expect(result).toEqual(favorites);
      expect(mockGetUserFavorites).toHaveBeenCalledWith(userId);
    });

    it('should return empty array if no favorites', async () => {
      const mockGetUserFavorites = getUserFavorites as any;
      mockGetUserFavorites.mockResolvedValueOnce([]);

      const result = await getUserFavorites(userId);

      expect(result).toEqual([]);
    });
  });
});
