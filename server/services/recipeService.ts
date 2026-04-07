/**
 * Recipe Service Layer with Provider/Adapter Pattern
 * 
 * Architecture:
 * - RecipeProvider: Abstract interface for recipe data sources
 * - DevelopmentProvider: Mock data (development only)
 * - ProductionProvider: Real data from Spoonacular API
 * - RecipeService: Orchestrates provider selection with fallback strategy
 * 
 * Availability Strategy:
 * 1. Try production provider (Spoonacular API)
 * 2. If no API key: return status indicating MISSING_API_KEY
 * 3. If API fails: return status indicating API_ERROR
 * 4. Optional: enable mock provider for demo/development
 * 5. Frontend can detect status and show appropriate message
 */

import { logger } from '../_core/logger';
import {
  RecipeSummary,
  RecipeDetails,
  RecipeSearchResult,
  RecipeSearchParams,
  RecipeServiceInfo,
  RecipeServiceStatus,
} from '../../shared/types';

/**
 * Recipe Provider Interface
 * All data sources must implement this contract
 */
interface RecipeProvider {
  searchRecipes(params: RecipeSearchParams): Promise<RecipeSearchResult>;
  getRecipeDetails(recipeId: number): Promise<RecipeDetails | null>;
  getRandomRecipes(count: number): Promise<RecipeSummary[]>;
  getRecipesByCuisine(cuisine: string, count: number): Promise<RecipeSummary[]>;
  getRecipesByDiet(diet: string, count: number): Promise<RecipeSummary[]>;
}

/**
 * Development Provider - Mock data for development/testing
 * Only used when explicitly requested or when production provider fails
 */
class DevelopmentProvider implements RecipeProvider {
  private generateMockRecipeSummary(id: number): RecipeSummary {
    const cuisines = ['Italian', 'Asian', 'Mexican', 'Indian', 'French'];
    return {
      id,
      title: `Mock Recipe ${id}`,
      image: '/images/recipe-placeholder.jpg',
      readyInMinutes: 30 + Math.random() * 60,
      servings: 2 + Math.floor(Math.random() * 6),
      sourceUrl: 'https://example.com',
      cuisines: [cuisines[Math.floor(Math.random() * cuisines.length)]],
      diets: ['Vegetarian'],
      difficulty: 'medium',
      calories: 300 + Math.random() * 400,
    };
  }

  private generateMockRecipes(count: number = 12): RecipeSummary[] {
    const mockRecipes: RecipeSummary[] = [];
    for (let i = 1; i <= count; i++) {
      mockRecipes.push(this.generateMockRecipeSummary(i));
    }
    return mockRecipes;
  }

  private generateMockRecipeDetails(recipeId: number): RecipeDetails {
    const summary = this.generateMockRecipeSummary(recipeId);
    return {
      ...summary,
      summary: `This is a detailed mock recipe for testing purposes. Recipe ${recipeId} includes all the necessary information.`,
      instructions: 'Mix ingredients. Cook. Serve.',
      extendedIngredients: [
        { id: 1, original: '2 cups flour', name: 'flour', amount: 2, unit: 'cups' },
        { id: 2, original: '1 egg', name: 'egg', amount: 1, unit: 'whole' },
      ],
      analyzedInstructions: [],
      nutrition: {},
    };
  }

  async searchRecipes(params: RecipeSearchParams): Promise<RecipeSearchResult> {
    const { limit = 12, offset = 0 } = params;
    const results = this.generateMockRecipes(limit);
    return { results, totalResults: results.length, offset, limit };
  }

  async getRecipeDetails(recipeId: number): Promise<RecipeDetails | null> {
    return this.generateMockRecipeDetails(recipeId);
  }

  async getRandomRecipes(count: number = 12): Promise<RecipeSummary[]> {
    return this.generateMockRecipes(count);
  }

  async getRecipesByCuisine(cuisine: string, count: number = 12): Promise<RecipeSummary[]> {
    return this.generateMockRecipes(count);
  }

  async getRecipesByDiet(diet: string, count: number = 12): Promise<RecipeSummary[]> {
    return this.generateMockRecipes(count);
  }
}

/**
 * Production Provider - Real data from Spoonacular API
 * Fetches real recipe data from external API
 */
class ProductionProvider implements RecipeProvider {
  private apiKey: string | null = null;
  private apiBaseUrl = 'https://api.spoonacular.com/recipes';

  constructor() {
    this.apiKey = process.env.SPOONACULAR_API_KEY || null;
  }

  isAvailable(): boolean {
    return !!this.apiKey;
  }

  /**
   * Search recipes from Spoonacular API
   */
  async searchRecipes(params: RecipeSearchParams): Promise<RecipeSearchResult> {
    const { query, offset = 0, limit = 12 } = params;

    try {
      if (!query || !query.trim()) {
        return { results: [], totalResults: 0, offset, limit };
      }

      if (!this.apiKey) {
        logger.warn('ProductionProvider.searchRecipes', 'No Spoonacular API key configured');
        return { results: [], totalResults: 0, offset, limit };
      }

      const url = new URL(`${this.apiBaseUrl}/complexSearch`);
      url.searchParams.append('query', query);
      url.searchParams.append('number', limit.toString());
      url.searchParams.append('offset', offset.toString());
      url.searchParams.append('apiKey', this.apiKey);

      const response = await fetch(url.toString());
      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const data = await response.json();
      return {
        results: (data.results || []).map((r: any) => this.formatSummary(r)),
        totalResults: data.totalResults || 0,
        offset,
        limit,
      };
    } catch (error) {
      logger.error('ProductionProvider.searchRecipes', error as Error, { query, offset, limit });
      return { results: [], totalResults: 0, offset, limit };
    }
  }

  /**
   * Get recipe details from Spoonacular API
   */
  async getRecipeDetails(recipeId: number): Promise<RecipeDetails | null> {
    try {
      if (!this.apiKey) {
        logger.warn('ProductionProvider.getRecipeDetails', 'No Spoonacular API key configured');
        return null;
      }

      const url = new URL(`${this.apiBaseUrl}/${recipeId}/information`);
      url.searchParams.append('apiKey', this.apiKey);

      const response = await fetch(url.toString());
      if (!response.ok) {
        if (response.status === 404) {
          return null;
        }
        throw new Error(`API error: ${response.status}`);
      }

      const data = await response.json();
      return this.formatDetails(data);
    } catch (error) {
      logger.error('ProductionProvider.getRecipeDetails', error as Error, { recipeId });
      return null;
    }
  }

  /**
   * Get random recipes from Spoonacular API
   */
  async getRandomRecipes(count: number = 12): Promise<RecipeSummary[]> {
    try {
      if (!this.apiKey) {
        logger.warn('ProductionProvider.getRandomRecipes', 'No Spoonacular API key configured');
        return [];
      }

      const url = new URL(`${this.apiBaseUrl}/random`);
      url.searchParams.append('number', count.toString());
      url.searchParams.append('apiKey', this.apiKey);

      const response = await fetch(url.toString());
      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const data = await response.json();
      return (data.recipes || []).map((r: any) => this.formatSummary(r));
    } catch (error) {
      logger.error('ProductionProvider.getRandomRecipes', error as Error, { count });
      return [];
    }
  }

  /**
   * Get recipes by cuisine from Spoonacular API
   */
  async getRecipesByCuisine(cuisine: string, count: number = 12): Promise<RecipeSummary[]> {
    try {
      if (!this.apiKey) {
        logger.warn('ProductionProvider.getRecipesByCuisine', 'No Spoonacular API key configured');
        return [];
      }

      const url = new URL(`${this.apiBaseUrl}/complexSearch`);
      url.searchParams.append('cuisine', cuisine);
      url.searchParams.append('number', count.toString());
      url.searchParams.append('apiKey', this.apiKey);

      const response = await fetch(url.toString());
      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const data = await response.json();
      return (data.results || []).map((r: any) => this.formatSummary(r));
    } catch (error) {
      logger.error('ProductionProvider.getRecipesByCuisine', error as Error, { cuisine, count });
      return [];
    }
  }

  /**
   * Get recipes by diet from Spoonacular API
   */
  async getRecipesByDiet(diet: string, count: number = 12): Promise<RecipeSummary[]> {
    try {
      if (!this.apiKey) {
        logger.warn('ProductionProvider.getRecipesByDiet', 'No Spoonacular API key configured');
        return [];
      }

      const url = new URL(`${this.apiBaseUrl}/complexSearch`);
      url.searchParams.append('diet', diet);
      url.searchParams.append('number', count.toString());
      url.searchParams.append('apiKey', this.apiKey);

      const response = await fetch(url.toString());
      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const data = await response.json();
      return (data.results || []).map((r: any) => this.formatSummary(r));
    } catch (error) {
      logger.error('ProductionProvider.getRecipesByDiet', error as Error, { diet, count });
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

/**
 * Recipe Service - Main orchestrator
 * Manages provider selection with availability strategy and status reporting
 */
class RecipeService {
  private productionProvider: ProductionProvider;
  private developmentProvider: DevelopmentProvider;
  private useMockProvider: boolean;

  constructor() {
    this.productionProvider = new ProductionProvider();
    this.developmentProvider = new DevelopmentProvider();
    this.useMockProvider = process.env.RECIPE_PROVIDER === 'mock' || !this.productionProvider.isAvailable();
  }

  /**
   * Get service status information
   */
  private getServiceStatus(): RecipeServiceInfo {
    const isProductionAvailable = this.productionProvider.isAvailable();

    if (this.useMockProvider) {
      return {
        status: 'available',
        provider: 'mock',
        message: 'Using mock data for development',
      };
    }

    if (!isProductionAvailable) {
      return {
        status: 'missing_api_key',
        provider: 'spoonacular',
        message: 'Recipe API key not configured. Please set SPOONACULAR_API_KEY environment variable.',
      };
    }

    return {
      status: 'available',
      provider: 'spoonacular',
    };
  }

  /**
   * Get appropriate provider based on configuration
   */
  private getProvider(): RecipeProvider {
    if (this.useMockProvider) {
      return this.developmentProvider;
    }
    return this.productionProvider;
  }

  /**
   * Check if production provider is available
   */
  isProductionAvailable(): boolean {
    return this.productionProvider.isAvailable();
  }

  /**
   * Search recipes by query
   */
  async searchRecipes(params: RecipeSearchParams): Promise<RecipeSearchResult & { serviceStatus: RecipeServiceInfo }> {
    const { query, offset = 0, limit = 12, requestId } = params;
    const serviceStatus = this.getServiceStatus();

    try {
      if (!query.trim()) {
        return {
          results: [],
          totalResults: 0,
          offset,
          limit,
          serviceStatus: { ...serviceStatus, requestId },
        };
      }

      const provider = this.getProvider();
      const result = await provider.searchRecipes(params);

      logger.info('RecipeService.searchRecipes', 'Search completed', {
        query,
        resultCount: result.results.length,
        provider: this.useMockProvider ? 'mock' : 'production',
        requestId,
      });

      return {
        ...result,
        serviceStatus: { ...serviceStatus, requestId },
      };
    } catch (error) {
      logger.error('RecipeService.searchRecipes', error as Error, { query, requestId });
      return {
        results: [],
        totalResults: 0,
        offset,
        limit,
        serviceStatus: {
          ...serviceStatus,
          status: 'api_error',
          message: 'Failed to fetch recipes. Please try again later.',
          requestId,
        },
      };
    }
  }

  /**
   * Get recipe details
   */
  async getRecipeDetails(
    recipeId: number,
    requestId?: string
  ): Promise<{ data: RecipeDetails | null; serviceStatus: RecipeServiceInfo }> {
    const serviceStatus = this.getServiceStatus();

    try {
      const provider = this.getProvider();
      const recipe = await provider.getRecipeDetails(recipeId);

      if (!recipe) {
        logger.warn('RecipeService.getRecipeDetails', 'Recipe not found', { recipeId, requestId });
        return {
          data: null,
          serviceStatus: { ...serviceStatus, requestId },
        };
      }

      logger.info('RecipeService.getRecipeDetails', 'Recipe fetched', {
        recipeId,
        provider: this.useMockProvider ? 'mock' : 'production',
        requestId,
      });

      return {
        data: recipe,
        serviceStatus: { ...serviceStatus, requestId },
      };
    } catch (error) {
      logger.error('RecipeService.getRecipeDetails', error as Error, { recipeId, requestId });
      return {
        data: null,
        serviceStatus: {
          ...serviceStatus,
          status: 'api_error',
          message: 'Failed to fetch recipe details. Please try again later.',
          requestId,
        },
      };
    }
  }

  /**
   * Get random recipes
   */
  async getRandomRecipes(
    count: number = 12,
    requestId?: string
  ): Promise<{ data: RecipeSummary[]; serviceStatus: RecipeServiceInfo }> {
    const serviceStatus = this.getServiceStatus();

    try {
      const provider = this.getProvider();
      const recipes = await provider.getRandomRecipes(count);

      logger.info('RecipeService.getRandomRecipes', 'Random recipes fetched', {
        count: recipes.length,
        provider: this.useMockProvider ? 'mock' : 'production',
        requestId,
      });

      return {
        data: recipes,
        serviceStatus: { ...serviceStatus, requestId },
      };
    } catch (error) {
      logger.error('RecipeService.getRandomRecipes', error as Error, { count, requestId });
      return {
        data: [],
        serviceStatus: {
          ...serviceStatus,
          status: 'api_error',
          message: 'Failed to fetch random recipes. Please try again later.',
          requestId,
        },
      };
    }
  }

  /**
   * Get recipes by cuisine
   */
  async getRecipesByCuisine(
    cuisine: string,
    count: number = 12,
    requestId?: string
  ): Promise<{ data: RecipeSummary[]; serviceStatus: RecipeServiceInfo }> {
    const serviceStatus = this.getServiceStatus();

    try {
      const provider = this.getProvider();
      const recipes = await provider.getRecipesByCuisine(cuisine, count);

      logger.info('RecipeService.getRecipesByCuisine', 'Cuisine recipes fetched', {
        cuisine,
        count: recipes.length,
        provider: this.useMockProvider ? 'mock' : 'production',
        requestId,
      });

      return {
        data: recipes,
        serviceStatus: { ...serviceStatus, requestId },
      };
    } catch (error) {
      logger.error('RecipeService.getRecipesByCuisine', error as Error, { cuisine, count, requestId });
      return {
        data: [],
        serviceStatus: {
          ...serviceStatus,
          status: 'api_error',
          message: 'Failed to fetch recipes. Please try again later.',
          requestId,
        },
      };
    }
  }

  /**
   * Get recipes by diet
   */
  async getRecipesByDiet(
    diet: string,
    count: number = 12,
    requestId?: string
  ): Promise<{ data: RecipeSummary[]; serviceStatus: RecipeServiceInfo }> {
    const serviceStatus = this.getServiceStatus();

    try {
      const provider = this.getProvider();
      const recipes = await provider.getRecipesByDiet(diet, count);

      logger.info('RecipeService.getRecipesByDiet', 'Diet recipes fetched', {
        diet,
        count: recipes.length,
        provider: this.useMockProvider ? 'mock' : 'production',
        requestId,
      });

      return {
        data: recipes,
        serviceStatus: { ...serviceStatus, requestId },
      };
    } catch (error) {
      logger.error('RecipeService.getRecipesByDiet', error as Error, { diet, count, requestId });
      return {
        data: [],
        serviceStatus: {
          ...serviceStatus,
          status: 'api_error',
          message: 'Failed to fetch recipes. Please try again later.',
          requestId,
        },
      };
    }
  }
}

export const recipeService = new RecipeService();
