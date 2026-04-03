/**
 * Recipe Service Abstraction
 * 
 * Primary source: tRPC backend routes (recipe.search, recipe.details, etc.)
 * Fallback: Mock data (for development/offline)
 * 
 * This layer ensures consistent API for frontend components
 * while allowing flexible backend implementation
 */

import { trpc } from './trpc';

export interface Recipe {
  id: number;
  title: string;
  image: string;
  readyInMinutes: number;
  servings: number;
  sourceUrl: string;
  cuisines?: string[];
  diets?: string[];
  summary?: string;
  instructions?: string;
  extendedIngredients?: Array<{
    id: number;
    original: string;
    name: string;
    amount: number;
    unit: string;
  }>;
}

/**
 * Generate mock recipes (fallback only)
 */
function generateMockRecipes(count: number = 12): Recipe[] {
  const cuisines = ['Italian', 'Asian', 'Mexican', 'Indian', 'French'];
  const mockRecipes: Recipe[] = [];

  for (let i = 1; i <= count; i++) {
    mockRecipes.push({
      id: i,
      title: `Mock Recipe ${i}`,
      image: '/images/recipe-placeholder.jpg',
      readyInMinutes: 30 + Math.random() * 60,
      servings: 2 + Math.floor(Math.random() * 6),
      sourceUrl: 'https://example.com',
      cuisines: [cuisines[Math.floor(Math.random() * cuisines.length)]],
      summary: `This is a mock recipe for testing purposes. Recipe ${i} is a delicious dish.`,
    });
  }

  return mockRecipes;
}

/**
 * Generate mock recipe details (fallback only)
 */
function generateMockRecipeDetails(recipeId: number): Recipe {
  return {
    id: recipeId,
    title: `Mock Recipe ${recipeId}`,
    image: '/images/recipe-placeholder.jpg',
    readyInMinutes: 45,
    servings: 4,
    sourceUrl: 'https://example.com',
    cuisines: ['Italian'],
    diets: ['Vegetarian'],
    summary: `This is a detailed mock recipe for testing purposes. Recipe ${recipeId} includes all the necessary information.`,
    instructions: 'Mix ingredients. Cook. Serve.',
    extendedIngredients: [
      { id: 1, original: '2 cups flour', name: 'flour', amount: 2, unit: 'cups' },
      { id: 2, original: '1 egg', name: 'egg', amount: 1, unit: 'whole' },
    ],
  };
}

/**
 * Recipe Service - Primary backend-first, fallback to mock
 */
export const recipeService = {
  /**
   * Search recipes by query
   * Primary: tRPC backend
   * Fallback: mock data
   */
  async searchRecipes(
    query: string,
    filters?: { offset?: number; number?: number }
  ): Promise<Recipe[]> {
    try {
      // Try backend first
      const result = await trpc.recipe.search.query({
        query,
        offset: filters?.offset || 0,
        number: filters?.number || 12,
      });

      // If backend returns results, use them
      if (result.results && result.results.length > 0) {
        return result.results;
      }

      // Otherwise fallback to mock
      console.warn('[RecipeService] Backend search returned empty, using mock data');
      return generateMockRecipes(filters?.number || 12);
    } catch (error) {
      console.error('[RecipeService] Search failed, using mock data:', error);
      return generateMockRecipes(filters?.number || 12);
    }
  },

  /**
   * Get recipe details by ID
   * Primary: tRPC backend
   * Fallback: mock data
   */
  async getRecipeDetails(recipeId: number): Promise<Recipe | null> {
    try {
      // Try backend first
      const result = await trpc.recipe.details.query({ recipeId });

      // If backend returns data, use it
      if (result) {
        return result;
      }

      // Otherwise fallback to mock
      console.warn('[RecipeService] Backend details returned null, using mock data');
      return generateMockRecipeDetails(recipeId);
    } catch (error) {
      console.error('[RecipeService] Details fetch failed, using mock data:', error);
      return generateMockRecipeDetails(recipeId);
    }
  },

  /**
   * Get random recipes
   * Primary: tRPC backend
   * Fallback: mock data
   */
  async getRandomRecipes(count: number = 12): Promise<Recipe[]> {
    try {
      // Try backend first
      const result = await trpc.recipe.random.query({ number: count });

      // If backend returns results, use them
      if (result && result.length > 0) {
        return result;
      }

      // Otherwise fallback to mock
      console.warn('[RecipeService] Backend random returned empty, using mock data');
      return generateMockRecipes(count);
    } catch (error) {
      console.error('[RecipeService] Random fetch failed, using mock data:', error);
      return generateMockRecipes(count);
    }
  },

  /**
   * Get recipes by cuisine
   * Primary: tRPC backend
   * Fallback: mock data
   */
  async getRecipesByCuisine(cuisine: string, count: number = 12): Promise<Recipe[]> {
    try {
      // Try backend first
      const result = await trpc.recipe.byCuisine.query({ cuisine, number: count });

      // If backend returns results, use them
      if (result && result.length > 0) {
        return result;
      }

      // Otherwise fallback to mock
      console.warn(`[RecipeService] Backend ${cuisine} recipes returned empty, using mock data`);
      return generateMockRecipes(count);
    } catch (error) {
      console.error(`[RecipeService] ${cuisine} recipes fetch failed, using mock data:`, error);
      return generateMockRecipes(count);
    }
  },

  /**
   * Get recipes by diet
   * Primary: tRPC backend
   * Fallback: mock data
   */
  async getRecipesByDiet(diet: string, count: number = 12): Promise<Recipe[]> {
    try {
      // Try backend first
      const result = await trpc.recipe.byDiet.query({ diet, number: count });

      // If backend returns results, use them
      if (result && result.length > 0) {
        return result;
      }

      // Otherwise fallback to mock
      console.warn(`[RecipeService] Backend ${diet} recipes returned empty, using mock data`);
      return generateMockRecipes(count);
    } catch (error) {
      console.error(`[RecipeService] ${diet} recipes fetch failed, using mock data:`, error);
      return generateMockRecipes(count);
    }
  },
};

/**
 * DEPRECATED: Direct mock functions
 * Use recipeService instead
 */
export function getRandomRecipes(count: number = 12): Promise<Recipe[]> {
  console.warn('[DEPRECATED] getRandomRecipes() - Use recipeService.getRandomRecipes() instead');
  return recipeService.getRandomRecipes(count);
}

export function getRecipesByCuisine(cuisine: string, count: number = 12): Promise<Recipe[]> {
  console.warn('[DEPRECATED] getRecipesByCuisine() - Use recipeService.getRecipesByCuisine() instead');
  return recipeService.getRecipesByCuisine(cuisine, count);
}

export function getRecipesByDiet(diet: string, count: number = 12): Promise<Recipe[]> {
  console.warn('[DEPRECATED] getRecipesByDiet() - Use recipeService.getRecipesByDiet() instead');
  return recipeService.getRecipesByDiet(diet, count);
}

export function searchRecipes(query: string): Promise<Recipe[]> {
  console.warn('[DEPRECATED] searchRecipes() - Use recipeService.searchRecipes() instead');
  return recipeService.searchRecipes(query);
}

export function getRecipeDetails(recipeId: number): Promise<Recipe | null> {
  console.warn('[DEPRECATED] getRecipeDetails() - Use recipeService.getRecipeDetails() instead');
  return recipeService.getRecipeDetails(recipeId);
}
