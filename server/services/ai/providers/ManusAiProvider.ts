import { invokeLLM } from "../../../_core/llm";
import {
  AIRecognizeIngredientsResult,
  AIRecipeRecommendationsResult,
  aiRecognizeIngredientsResultSchema,
  aiRecipeRecommendationsResultSchema,
} from "../types";

function parseJsonContent(content: unknown): unknown {
  if (typeof content === "string") {
    return JSON.parse(content);
  }

  return JSON.parse(JSON.stringify(content));
}

export class ManusAiProvider {
  async recognizeIngredients(imageUrl: string): Promise<AIRecognizeIngredientsResult> {
    const response = await invokeLLM({
      messages: [
        {
          role: "system",
          content:
            "You are an expert food and ingredient recognition AI. Analyze the provided image URL and identify all visible food ingredients. Return a JSON object with ingredients array.",
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

    return aiRecognizeIngredientsResultSchema.parse(parseJsonContent(content));
  }

  async getRecipeRecommendations(
    ingredients: string[],
    maxRecipes: number
  ): Promise<AIRecipeRecommendationsResult> {
    const response = await invokeLLM({
      messages: [
        {
          role: "system",
          content:
            "You are a creative culinary expert. Given a list of ingredients, suggest delicious recipes. Return a JSON object with recipes array.",
        },
        {
          role: "user",
          content: `I have these ingredients: ${ingredients.join(", ")}. Please suggest ${maxRecipes} recipes.`,
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
                  required: [
                    "name",
                    "description",
                    "ingredients_used",
                    "difficulty",
                    "cookTime",
                  ],
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

    return aiRecipeRecommendationsResultSchema.parse(parseJsonContent(content));
  }
}
