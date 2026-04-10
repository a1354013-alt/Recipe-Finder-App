/**
 * Recipe Provider Interface
 * 
 * Defines the contract for all recipe data sources.
 * All providers must implement these methods with consistent return types.
 */

import {
  RecipeDetails,
  RecipeSearchParams,
  RecipeSearchResult,
  RecipeSummary,
} from "../../../shared/types";

/**
 * Provider error types for better error handling
 */
export enum ProviderErrorType {
  MISSING_API_KEY = 'MISSING_API_KEY',
  RATE_LIMITED = 'RATE_LIMITED',
  API_ERROR = 'API_ERROR',
  NOT_FOUND = 'NOT_FOUND',
  TIMEOUT = 'TIMEOUT',
  INVALID_INPUT = 'INVALID_INPUT',
  UNKNOWN = 'UNKNOWN',
}

/**
 * Provider error with type information
 */
export class ProviderError extends Error {
  constructor(
    public type: ProviderErrorType,
    message: string,
    public statusCode?: number,
    public originalError?: Error
  ) {
    super(message);
    this.name = 'ProviderError';
  }
}

/**
 * Recipe Provider Interface
 * All recipe data sources must implement this contract
 */
export interface IRecipeProvider {
  getName(): string;
  isAvailable(): Promise<boolean>;
  searchRecipes(params: RecipeSearchParams): Promise<RecipeSearchResult>;
  getRecipeDetails(recipeId: number): Promise<RecipeDetails | null>;
  getRandomRecipes(count: number): Promise<RecipeSummary[]>;
  getRecipesByCuisine(cuisine: string, count: number): Promise<RecipeSummary[]>;
  getRecipesByDiet(diet: string, count: number): Promise<RecipeSummary[]>;
  getStatus(): Promise<{
    available: boolean;
    message?: string;
    lastError?: string;
  }>;
}

export interface ProviderConfig {
  enabled: boolean;
  priority?: number;
  timeout?: number;
  retries?: number;
}

export abstract class BaseRecipeProvider implements IRecipeProvider {
  protected config: ProviderConfig;
  protected lastError?: string;

  constructor(config: ProviderConfig = { enabled: true }) {
    this.config = config;
  }

  abstract getName(): string;

  abstract isAvailable(): Promise<boolean>;

  abstract searchRecipes(params: RecipeSearchParams): Promise<RecipeSearchResult>;

  abstract getRecipeDetails(recipeId: number): Promise<RecipeDetails | null>;

  abstract getRandomRecipes(count: number): Promise<RecipeSummary[]>;

  abstract getRecipesByCuisine(cuisine: string, count: number): Promise<RecipeSummary[]>;

  abstract getRecipesByDiet(diet: string, count: number): Promise<RecipeSummary[]>;

  async getStatus(): Promise<{
    available: boolean;
    message?: string;
    lastError?: string;
  }> {
    const available = await this.isAvailable();
    return {
      available,
      lastError: this.lastError,
    };
  }

  /**
   * Protected helper to record errors
   */
  protected recordError(error: string): void {
    this.lastError = error;
  }

  /**
   * Protected helper to clear errors
   */
  protected clearError(): void {
    this.lastError = undefined;
  }

  /**
   * Protected helper for timeout handling
   */
  protected async withTimeout<T>(promise: Promise<T>, timeoutMs: number = 5000): Promise<T> {
    return Promise.race([
      promise,
      new Promise<T>((_, reject) =>
        setTimeout(() => reject(new ProviderError(ProviderErrorType.TIMEOUT, `Request timeout after ${timeoutMs}ms`)), timeoutMs)
      ),
    ]);
  }
}
