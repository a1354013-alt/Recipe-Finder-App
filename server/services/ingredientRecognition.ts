/**
 * Ingredient Recognition Service
 * 
 * Handles the complete AI ingredient recognition pipeline:
 * 1. Image upload to storage
 * 2. AI ingredient recognition
 * 3. Recipe recommendation based on ingredients
 * 4. Store history with results
 */

import { invokeLLM } from '../_core/llm';
import { storagePut } from '../storage';
import { addAIRecognitionHistory } from '../db';
import { logger } from '../_core/logger';

export interface IngredientRecognitionResult {
  ingredients: string[];
  recommendedRecipes: string[];
  imageUrl: string;
  requestId?: string;
}

export interface IngredientRecognitionInput {
  imageUrl: string;
  userId: number;
  requestId?: string;
}

/**
 * Recognize ingredients from image using LLM
 */
export async function recognizeIngredients(
  imageUrl: string,
  requestId?: string
): Promise<string[]> {
  try {
    const response = await invokeLLM({
      messages: [
        {
          role: 'system',
          content: 'You are a culinary expert. Analyze the image and extract all visible ingredients. Return a JSON array of ingredient names.',
        },
        {
          role: 'user',
          content: [
            {
              type: 'text' as const,
              text: 'What ingredients do you see in this image? Return as JSON array like ["ingredient1", "ingredient2"]',
            },
            {
              type: 'image_url' as const,
              image_url: {
                url: imageUrl,
                detail: 'auto' as const,
              },
            },
          ] as any,
        },
      ] as any,
      response_format: {
        type: 'json_schema',
        json_schema: {
          name: 'ingredients_list',
          strict: true,
          schema: {
            type: 'object',
            properties: {
              ingredients: {
                type: 'array',
                items: { type: 'string' },
                description: 'List of recognized ingredients',
              },
            },
            required: ['ingredients'],
            additionalProperties: false,
          },
        },
      },
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      logger.error('[IngredientRecognition] Empty response from LLM', { requestId });
      return [];
    }

    // Handle content as string or array
    const contentStr = typeof content === 'string' ? content : 
      Array.isArray(content) ? content.find(c => typeof c === 'string' || (c && 'text' in c)) : '';
    const textContent = typeof contentStr === 'string' ? contentStr : 
      (contentStr && 'text' in contentStr) ? (contentStr as any).text : '';
    
    const parsed = JSON.parse(textContent as string);
    const ingredients = parsed.ingredients || [];
    
    logger.info(
      '[IngredientRecognition] Ingredients recognized',
      `Recognized ${ingredients.length} ingredients`,
      { ingredients, requestId }
    );

    return ingredients;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error(
      '[IngredientRecognition] Failed to recognize ingredients',
      { error: errorMessage, requestId }
    );
    return [];
  }
}

/**
 * Get recipe recommendations based on ingredients
 */
export async function getRecipeRecommendations(
  ingredients: string[],
  requestId?: string
): Promise<string[]> {
  if (ingredients.length === 0) {
    return [];
  }

  try {
    const ingredientList = ingredients.join(', ');
    const response = await invokeLLM({
      messages: [
        {
          role: 'system',
          content: 'You are a professional chef. Suggest 3-5 recipes that can be made with the given ingredients. Return a JSON array of recipe names.',
        },
        {
          role: 'user',
          content: `I have these ingredients: ${ingredientList}. What recipes can I make? Return as JSON array like ["recipe1", "recipe2"]` as any,
        },
      ] as any,
      response_format: {
        type: 'json_schema',
        json_schema: {
          name: 'recipes_list',
          strict: true,
          schema: {
            type: 'object',
            properties: {
              recipes: {
                type: 'array',
                items: { type: 'string' },
                description: 'List of recommended recipes',
              },
            },
            required: ['recipes'],
            additionalProperties: false,
          },
        },
      },
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      logger.error('[IngredientRecognition] Empty recipe recommendations', { requestId });
      return [];
    }

    // Handle content as string or array
    const contentStr = typeof content === 'string' ? content : 
      Array.isArray(content) ? content.find(c => typeof c === 'string' || (c && 'text' in c)) : '';
    const textContent = typeof contentStr === 'string' ? contentStr : 
      (contentStr && 'text' in contentStr) ? (contentStr as any).text : '';
    
    const parsed = JSON.parse(textContent as string);
    const recipes = parsed.recipes || [];

    logger.info(
      '[IngredientRecognition] Recipe recommendations generated',
      `Generated ${recipes.length} recipe recommendations`,
      { recipes, requestId }
    );

    return recipes;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error(
      '[IngredientRecognition] Failed to get recipe recommendations',
      { error: errorMessage, requestId }
    );
    return [];
  }
}

/**
 * Complete ingredient recognition pipeline
 * 
 * Flow:
 * 1. Recognize ingredients from image
 * 2. Get recipe recommendations
 * 3. Store history in database
 * 4. Return results
 */
export async function processIngredientRecognition(
  input: IngredientRecognitionInput
): Promise<IngredientRecognitionResult> {
  const { imageUrl, userId, requestId } = input;

  try {
    logger.info(
      '[IngredientRecognition] Starting pipeline',
      'Processing ingredient recognition',
      { userId, requestId }
    );

    // Step 1: Recognize ingredients
    const ingredients = await recognizeIngredients(imageUrl, requestId);

    // Step 2: Get recipe recommendations
    const recipes = await getRecipeRecommendations(ingredients, requestId);

    // Step 3: Store in history
    if (ingredients.length > 0) {
      await addAIRecognitionHistory(
        userId,
        imageUrl,
        ingredients,
        recipes,
        requestId
      );

      logger.info(
        '[IngredientRecognition] History saved',
        'Recognition result stored',
        { userId, ingredientCount: ingredients.length, requestId }
      );
    }

    // Step 4: Return results
    const result: IngredientRecognitionResult = {
      ingredients,
      recommendedRecipes: recipes,
      imageUrl,
      requestId,
    };

    logger.info(
      '[IngredientRecognition] Pipeline completed',
      'Ingredient recognition successful',
      { userId, requestId }
    );

    return result;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error(
      '[IngredientRecognition] Pipeline failed',
      { error: errorMessage, userId, requestId }
    );

    throw error;
  }
}

/**
 * Validate image URL before processing
 */
export function validateImageUrl(url: string): boolean {
  try {
    const urlObj = new URL(url);
    // Only allow https and http protocols
    if (!['https:', 'http:'].includes(urlObj.protocol)) {
      return false;
    }
    return true;
  } catch {
    return false;
  }
}
