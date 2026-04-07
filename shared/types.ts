/**
 * Unified type exports
 * Import shared types from this single entry point.
 */

export type * from "../drizzle/schema";
export * from "./_core/errors";

/**
 * Recipe Type Definitions
 * Separated into Summary (for lists) and Details (for detail page)
 */

export interface RecipeSummary {
  id: number;
  title: string;
  image: string;
  readyInMinutes: number;
  servings: number;
  sourceUrl: string;
  cuisines: string[];
  diets: string[];
  difficulty?: string;
  calories?: number;
}

export interface RecipeDetails extends RecipeSummary {
  summary: string;
  instructions: string;
  extendedIngredients: Array<{
    id: number;
    original: string;
    name: string;
    amount: number;
    unit: string;
  }>;
  analyzedInstructions: Array<{
    name: string;
    steps: Array<{
      number: number;
      step: string;
      ingredients?: Array<{ id: number; name: string }>;
      equipment?: Array<{ id: number; name: string }>;
    }>;
  }>;
  nutrition?: {
    nutrients?: Array<{
      name: string;
      amount: number;
      unit: string;
    }>;
  };
}

export interface RecipeSearchResult {
  results: RecipeSummary[];
  totalResults: number;
  offset: number;
  limit: number;
}

export interface RecipeSearchParams {
  query: string;
  offset?: number;
  limit?: number;
  filters?: {
    cookingTime?: string[];
    calories?: string[];
    difficulty?: string[];
    diets?: string[];
  };
  requestId?: string;
}

/**
 * Recipe Provider Configuration
 * Allows switching between different data sources
 */
export type RecipeProviderType = 'mock' | 'spoonacular' | 'database';

export interface RecipeProviderConfig {
  type: RecipeProviderType;
  apiKey?: string;
  enabled: boolean;
}

/**
 * Recipe Service Status
 * Used to communicate API availability and configuration status
 */
export type RecipeServiceStatus = 'available' | 'missing_api_key' | 'api_error' | 'unavailable';

export interface RecipeServiceInfo {
  status: RecipeServiceStatus;
  provider: 'mock' | 'spoonacular' | 'database';
  message?: string;
  requestId?: string;
}

export interface RecipeSearchResultWithStatus extends RecipeSearchResult {
  serviceStatus?: RecipeServiceInfo;
}

export interface RecipeDetailsWithStatus {
  data: RecipeDetails | null;
  serviceStatus?: RecipeServiceInfo;
}
