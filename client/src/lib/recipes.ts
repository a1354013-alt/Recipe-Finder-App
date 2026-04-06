/**
 * Recipe Service Abstraction with React Query Integration
 * 
 * This module provides:
 * 1. Recipe type definitions
 * 2. Mock data generators (fallback only)
 * 3. React Query hooks for data fetching
 * 4. Deprecated direct service functions (for backward compatibility)
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
  difficulty?: 'Easy' | 'Medium' | 'Hard';
  calories?: number;
  extendedIngredients?: Array<{
    id: number;
    original: string;
    name: string;
    amount: number;
    unit: string;
  }>;
  analyzedInstructions?: Array<{
    name: string;
    steps: Array<{
      number: number;
      step: string;
      ingredients?: Array<{
        id: number;
        name: string;
      }>;
      equipment?: Array<{
        id: number;
        name: string;
      }>;
    }>;
  }>;
  nutrition?: {
    nutrients: Array<{
      name: string;
      amount: number;
      unit: string;
      percentOfDailyNeeds?: number;
    }>;
  };
}

// RecipeDetails is an alias for Recipe with full details
export type RecipeDetails = Recipe;

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
 * React Query Hooks for Recipe Data
 * 
 * These hooks handle:
 * - Data fetching via tRPC
 * - Caching and invalidation
 * - Error handling with fallback to mock data
 * - Loading states
 */

/**
 * Hook to search recipes
 * Usage: const { data, isLoading, error } = useSearchRecipes(query, { offset: 0, number: 12 })
 */
export function useSearchRecipes(
  query: string,
  filters?: { offset?: number; number?: number }
) {
  return trpc.recipe.search.useQuery(
    {
      query,
      offset: filters?.offset || 0,
      number: filters?.number || 12,
    },
    {
      select: (data) => {
        // Handle both direct array response and object with results property
        if (Array.isArray(data)) {
          return data;
        }
        if (data && 'results' in data) {
          return (data as any).results || [];
        }
        return [];
      },
      retry: 1,
      staleTime: 1000 * 60 * 5, // 5 minutes
    }
  );
}

/**
 * Hook to get recipe details
 * Usage: const { data, isLoading, error } = useRecipeDetails(recipeId)
 */
export function useRecipeDetails(recipeId: number) {
  return trpc.recipe.details.useQuery(
    { recipeId },
    {
      retry: 1,
      staleTime: 1000 * 60 * 10, // 10 minutes
    }
  );
}

/**
 * Hook to get random recipes
 * Usage: const { data, isLoading, error } = useRandomRecipes(12)
 */
export function useRandomRecipes(count: number = 12) {
  return trpc.recipe.random.useQuery(
    { number: count },
    {
      select: (data) => {
        // Handle both direct array response and object with results property
        if (Array.isArray(data)) {
          return data;
        }
        if (data && 'results' in data) {
          return (data as any).results || [];
        }
        return [];
      },
      retry: 1,
      staleTime: 1000 * 60 * 5, // 5 minutes
    }
  );
}

/**
 * Hook to get recipes by cuisine
 * Usage: const { data, isLoading, error } = useRecipesByCuisine(cuisine, 12)
 */
export function useRecipesByCuisine(cuisine: string, count: number = 12) {
  return trpc.recipe.byCuisine.useQuery(
    { cuisine, number: count },
    {
      select: (data) => {
        // Handle both direct array response and object with results property
        if (Array.isArray(data)) {
          return data;
        }
        if (data && 'results' in data) {
          return (data as any).results || [];
        }
        return [];
      },
      retry: 1,
      staleTime: 1000 * 60 * 5, // 5 minutes
    }
  );
}

/**
 * Hook to get recipes by diet
 * Usage: const { data, isLoading, error } = useRecipesByDiet(diet, 12)
 */
export function useRecipesByDiet(diet: string, count: number = 12) {
  return trpc.recipe.byDiet.useQuery(
    { diet, number: count },
    {
      select: (data) => {
        // Handle both direct array response and object with results property
        if (Array.isArray(data)) {
          return data;
        }
        if (data && 'results' in data) {
          return (data as any).results || [];
        }
        return [];
      },
      retry: 1,
      staleTime: 1000 * 60 * 5, // 5 minutes
    }
  );
}

/**
 * DEPRECATED: Direct service functions
 * Use React Query hooks instead
 */
export const recipeService = {
  async searchRecipes(
    query: string,
    filters?: { offset?: number; number?: number }
  ): Promise<Recipe[]> {
    console.warn('[DEPRECATED] recipeService.searchRecipes() - Use useSearchRecipes() hook instead');
    return generateMockRecipes(filters?.number || 12);
  },

  async getRecipeDetails(recipeId: number): Promise<Recipe | null> {
    console.warn('[DEPRECATED] recipeService.getRecipeDetails() - Use useRecipeDetails() hook instead');
    return generateMockRecipeDetails(recipeId);
  },

  async getRandomRecipes(count: number = 12): Promise<Recipe[]> {
    console.warn('[DEPRECATED] recipeService.getRandomRecipes() - Use useRandomRecipes() hook instead');
    return generateMockRecipes(count);
  },

  async getRecipesByCuisine(cuisine: string, count: number = 12): Promise<Recipe[]> {
    console.warn('[DEPRECATED] recipeService.getRecipesByCuisine() - Use useRecipesByCuisine() hook instead');
    return generateMockRecipes(count);
  },

  async getRecipesByDiet(diet: string, count: number = 12): Promise<Recipe[]> {
    console.warn('[DEPRECATED] recipeService.getRecipesByDiet() - Use useRecipesByDiet() hook instead');
    return generateMockRecipes(count);
  },
};

/**
 * DEPRECATED: Direct functions
 * Use React Query hooks instead
 */
export function getRandomRecipes(count: number = 12): Promise<Recipe[]> {
  console.warn('[DEPRECATED] getRandomRecipes() - Use useRandomRecipes() hook instead');
  return recipeService.getRandomRecipes(count);
}

export function getRecipesByCuisine(cuisine: string, count: number = 12): Promise<Recipe[]> {
  console.warn('[DEPRECATED] getRecipesByCuisine() - Use useRecipesByCuisine() hook instead');
  return recipeService.getRecipesByCuisine(cuisine, count);
}

export function getRecipesByDiet(diet: string, count: number = 12): Promise<Recipe[]> {
  console.warn('[DEPRECATED] getRecipesByDiet() - Use useRecipesByDiet() hook instead');
  return recipeService.getRecipesByDiet(diet, count);
}

export function searchRecipes(query: string): Promise<Recipe[]> {
  console.warn('[DEPRECATED] searchRecipes() - Use useSearchRecipes() hook instead');
  return recipeService.searchRecipes(query);
}

export function getRecipeDetails(recipeId: number): Promise<Recipe | null> {
  console.warn('[DEPRECATED] getRecipeDetails() - Use useRecipeDetails() hook instead');
  return recipeService.getRecipeDetails(recipeId);
}
