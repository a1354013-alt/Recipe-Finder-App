import { logger } from "../_core/logger";
import {
  RecipeCollectionWithStatus,
  RecipeDetailsWithStatus,
  RecipeSearchParams,
  RecipeSearchResultWithStatus,
  RecipeServiceInfo,
} from "../../shared/types";
import { LocalRecipeProvider } from "./providers/LocalRecipeProvider";
import {
  IRecipeProvider,
  ProviderError,
  ProviderErrorType,
} from "./providers/RecipeProvider";
import { SpoonacularRecipeProvider } from "./providers/SpoonacularRecipeProvider";

class RecipeService {
  private readonly localProvider = new LocalRecipeProvider();
  private readonly spoonacularProvider = new SpoonacularRecipeProvider();

  private async resolvePrimaryProvider(): Promise<IRecipeProvider> {
    if (await this.spoonacularProvider.isAvailable()) {
      return this.spoonacularProvider;
    }

    return this.localProvider;
  }

  private getFallbackStatus(requestId?: string): RecipeServiceInfo {
    return {
      status: "missing_api_key",
      provider: "local",
      message:
        "SPOONACULAR_API_KEY is not configured. Serving local catalog data as a stable fallback.",
      requestId,
    };
  }

  private getSuccessStatus(providerName: "local" | "spoonacular", requestId?: string): RecipeServiceInfo {
    if (providerName === "local") {
      return this.getFallbackStatus(requestId);
    }

    return {
      status: "available",
      provider: providerName,
      requestId,
    };
  }

  private getErrorStatus(error: unknown, requestId?: string): RecipeServiceInfo {
    const message = error instanceof Error ? error.message : "Unknown recipe provider error";

    if (error instanceof ProviderError && error.type === ProviderErrorType.MISSING_API_KEY) {
      return this.getFallbackStatus(requestId);
    }

    return {
      status: "api_error",
      provider: "local",
      message,
      requestId,
    };
  }

  async searchRecipes(params: RecipeSearchParams): Promise<RecipeSearchResultWithStatus> {
    const { query, offset = 0, limit = 12, requestId } = params;
    const provider = await this.resolvePrimaryProvider();

    if (!query.trim()) {
      return {
        results: [],
        totalResults: 0,
        offset,
        limit,
        serviceStatus: this.getSuccessStatus(provider.getName() as "local" | "spoonacular", requestId),
      };
    }

    try {
      const result = await provider.searchRecipes(params);
      return {
        ...result,
        serviceStatus: this.getSuccessStatus(provider.getName() as "local" | "spoonacular", requestId),
      };
    } catch (error) {
      logger.error("RecipeService.searchRecipes", error as Error, { query, requestId });
      const fallbackResult = await this.localProvider.searchRecipes(params);
      return {
        ...fallbackResult,
        serviceStatus: this.getErrorStatus(error, requestId),
      };
    }
  }

  async getRecipeDetails(recipeId: number, requestId?: string): Promise<RecipeDetailsWithStatus> {
    const provider = await this.resolvePrimaryProvider();

    try {
      const data = await provider.getRecipeDetails(recipeId);
      return {
        data,
        serviceStatus: this.getSuccessStatus(provider.getName() as "local" | "spoonacular", requestId),
      };
    } catch (error) {
      logger.error("RecipeService.getRecipeDetails", error as Error, { recipeId, requestId });
      return {
        data: await this.localProvider.getRecipeDetails(recipeId),
        serviceStatus: this.getErrorStatus(error, requestId),
      };
    }
  }

  async getRandomRecipes(count = 12, requestId?: string): Promise<RecipeCollectionWithStatus> {
    const provider = await this.resolvePrimaryProvider();

    try {
      const data = await provider.getRandomRecipes(count);
      return {
        data,
        serviceStatus: this.getSuccessStatus(provider.getName() as "local" | "spoonacular", requestId),
      };
    } catch (error) {
      logger.error("RecipeService.getRandomRecipes", error as Error, { count, requestId });
      return {
        data: await this.localProvider.getRandomRecipes(count),
        serviceStatus: this.getErrorStatus(error, requestId),
      };
    }
  }

  async getRecipesByCuisine(cuisine: string, count = 12, requestId?: string): Promise<RecipeCollectionWithStatus> {
    const provider = await this.resolvePrimaryProvider();

    try {
      const data = await provider.getRecipesByCuisine(cuisine, count);
      return {
        data,
        serviceStatus: this.getSuccessStatus(provider.getName() as "local" | "spoonacular", requestId),
      };
    } catch (error) {
      logger.error("RecipeService.getRecipesByCuisine", error as Error, { cuisine, count, requestId });
      return {
        data: await this.localProvider.getRecipesByCuisine(cuisine, count),
        serviceStatus: this.getErrorStatus(error, requestId),
      };
    }
  }

  async getRecipesByDiet(diet: string, count = 12, requestId?: string): Promise<RecipeCollectionWithStatus> {
    const provider = await this.resolvePrimaryProvider();

    try {
      const data = await provider.getRecipesByDiet(diet, count);
      return {
        data,
        serviceStatus: this.getSuccessStatus(provider.getName() as "local" | "spoonacular", requestId),
      };
    } catch (error) {
      logger.error("RecipeService.getRecipesByDiet", error as Error, { diet, count, requestId });
      return {
        data: await this.localProvider.getRecipesByDiet(diet, count),
        serviceStatus: this.getErrorStatus(error, requestId),
      };
    }
  }
}

export const recipeService = new RecipeService();

export const searchRecipes = recipeService.searchRecipes.bind(recipeService);
export const getRecipeDetails = recipeService.getRecipeDetails.bind(recipeService);
export const getRandomRecipes = recipeService.getRandomRecipes.bind(recipeService);
export const getRecipesByCuisine = recipeService.getRecipesByCuisine.bind(recipeService);
export const getRecipesByDiet = recipeService.getRecipesByDiet.bind(recipeService);
