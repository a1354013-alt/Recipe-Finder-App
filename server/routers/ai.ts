/**
 * AI Router - Image Recognition & Recipe Recommendation
 * Supports both Manus AI and local Ollama
 */

import { z } from "zod";
import { publicProcedure, router } from "../_core/trpc";
import { invokeLLM } from "../_core/llm";
import { storagePut } from "../storage";
import { nanoid } from "nanoid";
import { createOllamaClient } from "../_core/ollama";
import { aiConfigManager } from "../_core/aiConfig";

/**
 * Helper function to recognize ingredients using selected AI provider
 */
async function recognizeIngredientsWithProvider(
  imageUrl: string,
  imageBase64?: string
): Promise<any> {
  const config = aiConfigManager.getConfig();

  if (config.provider === 'ollama') {
    const ollamaConfig = aiConfigManager.getOllamaConfig();
    const ollamaClient = createOllamaClient(ollamaConfig.url, ollamaConfig.model);
    return await ollamaClient.recognizeIngredients(imageBase64 || '', imageUrl);
  } else {
    // Use Manus AI (default)
    // @ts-ignore
    const response = await invokeLLM({
      messages: [
        {
          role: "system",
          content: "You are an expert food and ingredient recognition AI. Analyze the provided image URL and identify all visible food ingredients. Return a JSON object with ingredients array.",
        },
        {
          role: "user",
          content: `Please identify all the ingredients visible in this image: ${imageUrl}`,
        },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "ingredient_recognition",
          strict: true,
          schema: {
            type: "object",
            properties: {
              ingredients: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    name: { type: "string" },
                    quantity: { type: "string" },
                    unit: { type: "string" },
                  },
                  required: ["name", "quantity", "unit"],
                  additionalProperties: false,
                },
              },
              confidence: { type: "number" },
              notes: { type: "string" },
            },
            required: ["ingredients", "confidence"],
            additionalProperties: false,
          },
        },
      },
    });

    const content = response.choices[0]?.message.content;
    if (!content) {
      throw new Error("No response from LLM");
    }

    return JSON.parse(typeof content === 'string' ? content : JSON.stringify(content));
  }
}

/**
 * Helper function to get recipe recommendations using selected AI provider
 */
async function getRecipeRecommendationsWithProvider(
  ingredients: string[],
  maxRecipes: number
): Promise<any> {
  const config = aiConfigManager.getConfig();
  const ingredientsList = ingredients.join(", ");

  if (config.provider === 'ollama') {
    const ollamaConfig = aiConfigManager.getOllamaConfig();
    const ollamaClient = createOllamaClient(ollamaConfig.url, ollamaConfig.model);
    return await ollamaClient.getRecipeRecommendations(ingredients, maxRecipes);
  } else {
    // Use Manus AI (default)
    // @ts-ignore
    const response = await invokeLLM({
      messages: [
        {
          role: "system",
          content: "You are a creative culinary expert. Given a list of ingredients, suggest delicious recipes. Return a JSON object with recipes array.",
        },
        {
          role: "user",
          content: `I have these ingredients: ${ingredientsList}. Please suggest ${maxRecipes} recipes.`,
        },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "recipe_recommendations",
          strict: true,
          schema: {
            type: "object",
            properties: {
              recipes: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    name: { type: "string" },
                    description: { type: "string" },
                    ingredients_used: {
                      type: "array",
                      items: { type: "string" },
                    },
                    difficulty: {
                      type: "string",
                      enum: ["easy", "medium", "hard"],
                    },
                    cookTime: { type: "number" },
                    servings: { type: "number" },
                  },
                  required: ["name", "description", "ingredients_used", "difficulty", "cookTime"],
                  additionalProperties: false,
                },
              },
            },
            required: ["recipes"],
            additionalProperties: false,
          },
        },
      },
    });

    const content = response.choices[0]?.message.content;
    if (!content) {
      throw new Error("No response from LLM");
    }

    return JSON.parse(typeof content === 'string' ? content : JSON.stringify(content));
  }
}

export const aiRouter = router({
  /**
   * Recognize ingredients from an uploaded image
   */
  recognizeIngredients: publicProcedure
    .input(
      z.object({
        imageBase64: z.string(),
        mimeType: z.string().default("image/jpeg"),
      })
    )
    .mutation(async ({ input }) => {
      try {
        const buffer = Buffer.from(input.imageBase64, "base64");
        const fileKey = `ai-images/${nanoid()}.jpg`;
        
        const { url: imageUrl } = await storagePut(
          fileKey,
          buffer,
          input.mimeType
        );

        const result = await recognizeIngredientsWithProvider(imageUrl, input.imageBase64);
        
        return {
          success: true,
          ingredients: result.ingredients,
          confidence: result.confidence,
          notes: result.notes,
          imageUrl,
          provider: aiConfigManager.getProvider(),
        };
      } catch (error) {
        console.error("Error recognizing ingredients:", error);
        throw new Error(
          `Failed to recognize ingredients: ${error instanceof Error ? error.message : "Unknown error"}`
        );
      }
    }),

  /**
   * Get recipe recommendations based on ingredients
   */
  getRecipeRecommendations: publicProcedure
    .input(
      z.object({
        ingredients: z.array(z.string()),
        maxRecipes: z.number().default(5),
      })
    )
    .query(async ({ input }) => {
      try {
        const result = await getRecipeRecommendationsWithProvider(
          input.ingredients,
          input.maxRecipes
        );
        
        return {
          success: true,
          recipes: result.recipes,
          provider: aiConfigManager.getProvider(),
        };
      } catch (error) {
        console.error("Error getting recipe recommendations:", error);
        throw new Error(
          `Failed to get recommendations: ${error instanceof Error ? error.message : "Unknown error"}`
        );
      }
    }),

  /**
   * Get current AI provider configuration
   */
  getConfig: publicProcedure.query(() => {
    return aiConfigManager.getConfig();
  }),

  /**
   * Set AI provider (Manus or Ollama)
   */
  setProvider: publicProcedure
    .input(z.object({ provider: z.enum(['manus', 'ollama']) }))
    .mutation(({ input }) => {
      aiConfigManager.setProvider(input.provider);
      return { success: true, provider: input.provider };
    }),

  /**
   * Update Ollama configuration
   */
  setOllamaConfig: publicProcedure
    .input(
      z.object({
        url: z.string().url(),
        model: z.string(),
      })
    )
    .mutation(({ input }) => {
      aiConfigManager.setOllamaConfig(input.url, input.model);
      return { success: true, config: aiConfigManager.getOllamaConfig() };
    }),

  /**
   * Test Ollama connection
   */
  testOllamaConnection: publicProcedure
    .input(z.object({ url: z.string().url() }))
    .mutation(async ({ input }) => {
      try {
        const client = createOllamaClient(input.url);
        const isConnected = await client.testConnection();
        const models = isConnected ? await client.getAvailableModels() : [];
        return { success: isConnected, models };
      } catch (error) {
        console.error("Ollama connection test failed:", error);
        return { success: false, models: [] };
      }
    }),
});
