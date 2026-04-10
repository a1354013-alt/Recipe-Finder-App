import { createOllamaClient } from "../../../_core/ollama";
import {
  AIRecognizeIngredientsResult,
  AIRecipeRecommendationsResult,
} from "../types";

export class OllamaAiProvider {
  constructor(private readonly url: string, private readonly model: string) {}

  async recognizeIngredients(
    imageBase64: string,
    imageUrl?: string,
    requestId?: string
  ): Promise<AIRecognizeIngredientsResult> {
    return createOllamaClient(this.url, this.model).recognizeIngredients(
      imageBase64,
      imageUrl,
      requestId
    );
  }

  async getRecipeRecommendations(
    ingredients: string[],
    maxRecipes: number,
    requestId?: string
  ): Promise<AIRecipeRecommendationsResult> {
    return createOllamaClient(this.url, this.model).getRecipeRecommendations(
      ingredients,
      maxRecipes,
      requestId
    );
  }

  async testConnection(requestId?: string) {
    return createOllamaClient(this.url, this.model).testConnection(requestId);
  }

  async getAvailableModels(requestId?: string) {
    return createOllamaClient(this.url, this.model).getAvailableModels(requestId);
  }
}
