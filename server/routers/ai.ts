/**
 * AI Router - Image Recognition & Recipe Recommendation
 */

import { z } from "zod";
import { publicProcedure, router } from "../_core/trpc";
import { invokeLLM } from "../_core/llm";
import { storagePut } from "../storage";
import { nanoid } from "nanoid";

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
        // Convert base64 to buffer and upload to S3
        const buffer = Buffer.from(input.imageBase64, "base64");
        const fileKey = `ai-images/${nanoid()}.jpg`;
        
        const { url: imageUrl } = await storagePut(
          fileKey,
          buffer,
          input.mimeType
        );

        // Use LLM to recognize ingredients
        // @ts-ignore - Type compatibility issue with invokeLLM
        const response = await invokeLLM({
          messages: [
            {
              role: "system",
              content: "You are an expert food and ingredient recognition AI. Analyze the provided image URL and identify all visible food ingredients. Return a JSON array of ingredient names with their estimated quantities.",
            },
            {
              role: "user",
              content: `Please identify all the ingredients visible in this image and provide their estimated quantities. Image URL: ${imageUrl}`,
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

        const result = JSON.parse(typeof content === 'string' ? content : JSON.stringify(content));
        return {
          success: true,
          ingredients: result.ingredients,
          confidence: result.confidence,
          notes: result.notes,
          imageUrl,
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
        const ingredientsList = input.ingredients.join(", ");

        // @ts-ignore - Type compatibility issue with invokeLLM
        const response = await invokeLLM({
          messages: [
            {
              role: "system",
              content: "You are a creative culinary expert. Given a list of ingredients, suggest delicious recipes that can be made with these ingredients. Return a JSON array of recipe recommendations.",
            },
            {
              role: "user",
              content: `I have these ingredients available: ${ingredientsList}. Please suggest ${input.maxRecipes} delicious recipes I can make with them. Prioritize recipes that use most of these ingredients.`,
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

        const result = JSON.parse(typeof content === 'string' ? content : JSON.stringify(content));
        return {
          success: true,
          recipes: result.recipes,
        };
      } catch (error) {
        console.error("Error getting recipe recommendations:", error);
        throw new Error(
          `Failed to get recommendations: ${error instanceof Error ? error.message : "Unknown error"}`
        );
      }
    }),
});
