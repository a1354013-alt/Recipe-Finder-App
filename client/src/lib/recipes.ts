/**
 * Recipe Data Layer with Clear Fallback Strategy
 * 
 * Data Source Hierarchy:
 * 1. Real Data: Backend returns actual recipe data
 * 2. Empty Result: Backend returns empty array (no recipes found)
 * 3. Error: Backend fails or network error (no fallback to mock)
 * 
 * Key Principle:
 * - NO automatic fallback to mock data
 * - Client explicitly handles each case
 * - Mock data only for development/testing (not in production)
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

export type RecipeDetails = Recipe;

/**
 * React Query Hooks for Recipe Data
 * 
 * Each hook returns:
 * - data: Recipe[] or Recipe | null (real data or empty)
 * - isLoading: true while fetching
 * - error: Error object if request failed
 * - isError: true if request failed
 * 
 * NO fallback to mock data - client must handle error state
 */

/**
 * Hook to search recipes
 * 
 * Returns:
 * - data: Array of recipes (empty array if no results)
 * - error: Error object if request failed
 * 
 * Usage:
 * const { data = [], isLoading, error } = useSearchRecipes(query)
 * if (error) return <ErrorMessage error={error} />
 * if (data.length === 0) return <EmptyState />
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
        // Normalize response format
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
      // Do NOT fallback to mock data on error
      // Error will be propagated to component
    }
  );
}

/**
 * Hook to get recipe details
 * 
 * Returns:
 * - data: Recipe object or null (if not found)
 * - error: Error object if request failed
 * 
 * Usage:
 * const { data, isLoading, error } = useRecipeDetails(recipeId)
 * if (error) return <ErrorMessage error={error} />
 * if (!data) return <NotFound />
 */
export function useRecipeDetails(recipeId: number) {
  return trpc.recipe.details.useQuery(
    { recipeId },
    {
      retry: 1,
      staleTime: 1000 * 60 * 10, // 10 minutes
      // Do NOT fallback to mock data on error
      // Error will be propagated to component
    }
  );
}

/**
 * Hook to get random recipes
 * 
 * Returns:
 * - data: Array of recipes (empty array if error)
 * - error: Error object if request failed
 * 
 * Usage:
 * const { data = [], isLoading, error } = useRandomRecipes(12)
 * if (error) return <ErrorMessage error={error} />
 * if (data.length === 0) return <EmptyState />
 */
export function useRandomRecipes(count: number = 12) {
  return trpc.recipe.random.useQuery(
    { number: count },
    {
      select: (data) => {
        // Normalize response format
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
      // Do NOT fallback to mock data on error
      // Error will be propagated to component
    }
  );
}

/**
 * Hook to get recipes by cuisine
 * 
 * Returns:
 * - data: Array of recipes (empty array if no results)
 * - error: Error object if request failed
 * 
 * Usage:
 * const { data = [], isLoading, error } = useRecipesByCuisine('Italian', 12)
 * if (error) return <ErrorMessage error={error} />
 * if (data.length === 0) return <EmptyState />
 */
export function useRecipesByCuisine(cuisine: string, count: number = 12) {
  return trpc.recipe.byCuisine.useQuery(
    { cuisine, number: count },
    {
      select: (data) => {
        // Normalize response format
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
      // Do NOT fallback to mock data on error
      // Error will be propagated to component
    }
  );
}

/**
 * Hook to get recipes by diet
 * 
 * Returns:
 * - data: Array of recipes (empty array if no results)
 * - error: Error object if request failed
 * 
 * Usage:
 * const { data = [], isLoading, error } = useRecipesByDiet('Vegetarian', 12)
 * if (error) return <ErrorMessage error={error} />
 * if (data.length === 0) return <EmptyState />
 */
export function useRecipesByDiet(diet: string, count: number = 12) {
  return trpc.recipe.byDiet.useQuery(
    { diet, number: count },
    {
      select: (data) => {
        // Normalize response format
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
      // Do NOT fallback to mock data on error
      // Error will be propagated to component
    }
  );
}
