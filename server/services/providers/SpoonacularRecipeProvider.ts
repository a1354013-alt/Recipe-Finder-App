/**
 * Spoonacular Recipe Provider
 * 
 * Fetches real recipe data from Spoonacular API.
 * Includes timeout, retry, and comprehensive error handling.
 */

import { logger } from '../../_core/logger';
import { RecipeSummary, RecipeDetails, RecipeSearchResult, RecipeSearchParams } from '../../../shared/types';
import { BaseRecipeProvider, ProviderError, ProviderErrorType, ProviderConfig } from './RecipeProvider';

interface SpoonacularConfig extends ProviderConfig {
  apiKey?: string;
  baseUrl?: string;
}

export class SpoonacularRecipeProvider extends BaseRecipeProvider {
  private apiKey: string | null = null;
  private apiBaseUrl = 'https://api.spoonacular.com/recipes';

  constructor(config: SpoonacularConfig = { enabled: true }) {
    super(config);
    this.apiKey = config.apiKey || process.env.SPOONACULAR_API_KEY || null;
  }

  getName(): string {
    return 'spoonacular';
  }

  async isAvailable(): Promise<boolean> {
    return !!this.apiKey;
  }

  /**
   * Search recipes from Spoonacular API
   */
  async searchRecipes(params: RecipeSearchParams): Promise<RecipeSearchResult> {
    const { query, offset = 0, limit = 12, requestId } = params;

    try {
      if (!query || !query.trim()) {
        return { results: [], totalResults: 0, offset, limit };
      }

      if (!this.apiKey) {
        const error = 'Spoonacular API key not configured';
        this.recordError(error);
        logger.warn('SpoonacularRecipeProvider.searchRecipes', error, { requestId });
        throw new ProviderError(ProviderErrorType.MISSING_API_KEY, error);
      }

      const url = new URL(`${this.apiBaseUrl}/complexSearch`);
      url.searchParams.append('query', query);
      url.searchParams.append('number', limit.toString());
      url.searchParams.append('offset', offset.toString());
      url.searchParams.append('apiKey', this.apiKey);

      const response = await this.withTimeout(fetch(url.toString()), this.config.timeout || 5000);

      if (!response.ok) {
        if (response.status === 401 || response.status === 402) {
          const error = `API authentication failed: ${response.status}`;
          this.recordError(error);
          throw new ProviderError(ProviderErrorType.MISSING_API_KEY, error, response.status);
        }
        if (response.status === 429) {
          const error = 'API rate limit exceeded';
          this.recordError(error);
          throw new ProviderError(ProviderErrorType.RATE_LIMITED, error, response.status);
        }
        throw new ProviderError(ProviderErrorType.API_ERROR, `API error: ${response.status}`, response.status);
      }

      const data = await response.json();
      this.clearError();

      logger.info('SpoonacularRecipeProvider.searchRecipes', 'Search completed', {
        query,
        resultCount: (data.results || []).length,
        requestId,
      });

      return {
        results: (data.results || []).map((r: any) => this.formatSummary(r)),
        totalResults: data.totalResults || 0,
        offset,
        limit,
      };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      this.recordError(errorMsg);
      logger.error('SpoonacularRecipeProvider.searchRecipes', error as Error, { query, offset, limit, requestId });
      return { results: [], totalResults: 0, offset, limit };
    }
  }

  /**
   * Get recipe details from Spoonacular API
   */
  async getRecipeDetails(recipeId: number): Promise<RecipeDetails | null> {
    try {
      if (!this.apiKey) {
        const error = 'Spoonacular API key not configured';
        this.recordError(error);
        throw new ProviderError(ProviderErrorType.MISSING_API_KEY, error);
      }

      const url = new URL(`${this.apiBaseUrl}/${recipeId}/information`);
      url.searchParams.append('apiKey', this.apiKey);

      const response = await this.withTimeout(fetch(url.toString()), this.config.timeout || 5000);

      if (!response.ok) {
        if (response.status === 404) {
          return null;
        }
        if (response.status === 401 || response.status === 402) {
          throw new ProviderError(ProviderErrorType.MISSING_API_KEY, `API authentication failed: ${response.status}`, response.status);
        }
        if (response.status === 429) {
          throw new ProviderError(ProviderErrorType.RATE_LIMITED, 'API rate limit exceeded', response.status);
        }
        throw new ProviderError(ProviderErrorType.API_ERROR, `API error: ${response.status}`, response.status);
      }

      const data = await response.json();
      this.clearError();

      logger.info('SpoonacularRecipeProvider.getRecipeDetails', 'Recipe fetched', { recipeId });

      return this.formatDetails(data);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      this.recordError(errorMsg);
      logger.error('SpoonacularRecipeProvider.getRecipeDetails', error as Error, { recipeId });
      return null;
    }
  }

  /**
   * Get random recipes from Spoonacular API
   */
  async getRandomRecipes(count: number = 12): Promise<RecipeSummary[]> {
    try {
      if (!this.apiKey) {
        const error = 'Spoonacular API key not configured';
        this.recordError(error);
        throw new ProviderError(ProviderErrorType.MISSING_API_KEY, error);
      }

      const url = new URL(`${this.apiBaseUrl}/random`);
      url.searchParams.append('number', count.toString());
      url.searchParams.append('apiKey', this.apiKey);

      const response = await this.withTimeout(fetch(url.toString()), this.config.timeout || 5000);

      if (!response.ok) {
        if (response.status === 401 || response.status === 402) {
          throw new ProviderError(ProviderErrorType.MISSING_API_KEY, `API authentication failed: ${response.status}`, response.status);
        }
        if (response.status === 429) {
          throw new ProviderError(ProviderErrorType.RATE_LIMITED, 'API rate limit exceeded', response.status);
        }
        throw new ProviderError(ProviderErrorType.API_ERROR, `API error: ${response.status}`, response.status);
      }

      const data = await response.json();
      this.clearError();

      logger.info('SpoonacularRecipeProvider.getRandomRecipes', 'Random recipes fetched', { count: (data.recipes || []).length });

      return (data.recipes || []).map((r: any) => this.formatSummary(r));
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      this.recordError(errorMsg);
      logger.error('SpoonacularRecipeProvider.getRandomRecipes', error as Error, { count });
      return [];
    }
  }

  /**
   * Get recipes by cuisine from Spoonacular API
   */
  async getRecipesByCuisine(cuisine: string, count: number = 12): Promise<RecipeSummary[]> {
    try {
      if (!this.apiKey) {
        const error = 'Spoonacular API key not configured';
        this.recordError(error);
        throw new ProviderError(ProviderErrorType.MISSING_API_KEY, error);
      }

      const url = new URL(`${this.apiBaseUrl}/complexSearch`);
      url.searchParams.append('cuisine', cuisine);
      url.searchParams.append('number', count.toString());
      url.searchParams.append('apiKey', this.apiKey);

      const response = await this.withTimeout(fetch(url.toString()), this.config.timeout || 5000);

      if (!response.ok) {
        if (response.status === 401 || response.status === 402) {
          throw new ProviderError(ProviderErrorType.MISSING_API_KEY, `API authentication failed: ${response.status}`, response.status);
        }
        if (response.status === 429) {
          throw new ProviderError(ProviderErrorType.RATE_LIMITED, 'API rate limit exceeded', response.status);
        }
        throw new ProviderError(ProviderErrorType.API_ERROR, `API error: ${response.status}`, response.status);
      }

      const data = await response.json();
      this.clearError();

      logger.info('SpoonacularRecipeProvider.getRecipesByCuisine', 'Cuisine recipes fetched', {
        cuisine,
        count: (data.results || []).length,
      });

      return (data.results || []).map((r: any) => this.formatSummary(r));
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      this.recordError(errorMsg);
      logger.error('SpoonacularRecipeProvider.getRecipesByCuisine', error as Error, { cuisine, count });
      return [];
    }
  }

  /**
   * Get recipes by diet from Spoonacular API
   */
  async getRecipesByDiet(diet: string, count: number = 12): Promise<RecipeSummary[]> {
    try {
      if (!this.apiKey) {
        const error = 'Spoonacular API key not configured';
        this.recordError(error);
        throw new ProviderError(ProviderErrorType.MISSING_API_KEY, error);
      }

      const url = new URL(`${this.apiBaseUrl}/complexSearch`);
      url.searchParams.append('diet', diet);
      url.searchParams.append('number', count.toString());
      url.searchParams.append('apiKey', this.apiKey);

      const response = await this.withTimeout(fetch(url.toString()), this.config.timeout || 5000);

      if (!response.ok) {
        if (response.status === 401 || response.status === 402) {
          throw new ProviderError(ProviderErrorType.MISSING_API_KEY, `API authentication failed: ${response.status}`, response.status);
        }
        if (response.status === 429) {
          throw new ProviderError(ProviderErrorType.RATE_LIMITED, 'API rate limit exceeded', response.status);
        }
        throw new ProviderError(ProviderErrorType.API_ERROR, `API error: ${response.status}`, response.status);
      }

      const data = await response.json();
      this.clearError();

      logger.info('SpoonacularRecipeProvider.getRecipesByDiet', 'Diet recipes fetched', {
        diet,
        count: (data.results || []).length,
      });

      return (data.results || []).map((r: any) => this.formatSummary(r));
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      this.recordError(errorMsg);
      logger.error('SpoonacularRecipeProvider.getRecipesByDiet', error as Error, { diet, count });
      return [];
    }
  }

  /**
   * Format recipe from API response to RecipeSummary
   */
  private formatSummary(apiRecipe: any): RecipeSummary {
    return {
      id: apiRecipe.id,
      title: apiRecipe.title,
      image: apiRecipe.image,
      readyInMinutes: apiRecipe.readyInMinutes || 30,
      servings: apiRecipe.servings || 4,
      sourceUrl: apiRecipe.sourceUrl || '',
      cuisines: apiRecipe.cuisines || [],
      diets: apiRecipe.diets || [],
      difficulty: apiRecipe.difficulty || 'medium',
      calories: apiRecipe.nutrition?.nutrients?.find((n: any) => n.name === 'Calories')?.amount || 0,
    };
  }

  /**
   * Format recipe from API response to RecipeDetails
   */
  private formatDetails(apiRecipe: any): RecipeDetails {
    return {
      ...this.formatSummary(apiRecipe),
      summary: apiRecipe.summary || '',
      instructions: apiRecipe.instructions || '',
      extendedIngredients: apiRecipe.extendedIngredients || [],
      analyzedInstructions: apiRecipe.analyzedInstructions || [],
      nutrition: apiRecipe.nutrition || {},
    };
  }
}
